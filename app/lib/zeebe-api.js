/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

'use strict';

const path = require('path');

const log = require('./log')('app:zeebe-api');

const {
  pick,
  values
} = require('min-dash');

const errorReasons = {
  UNKNOWN: 'UNKNOWN',
  CONTACT_POINT_UNAVAILABLE: 'CONTACT_POINT_UNAVAILABLE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  CLUSTER_UNAVAILABLE: 'CLUSTER_UNAVAILABLE',
  FORBIDDEN: 'FORBIDDEN',
  OAUTH_URL: 'OAUTH_URL',
  UNSUPPORTED_ENGINE: 'UNSUPPORTED_ENGINE',
  INVALID_CLIENT_ID: 'INVALID_CLIENT_ID',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS'
};

const endpointTypes = {
  SELF_HOSTED: 'selfHosted',
  OAUTH: 'oauth',
  CAMUNDA_CLOUD: 'camundaCloud'
};

/**
 * @typedef {object} ZeebeClientParameters
 * @property {Endpoint} endpoint
 */

/**
 * @typedef {SelfHostedNoAuthEndpoint|SelfHostedOAuthEndpoint|CamundaCloudEndpoint} Endpoint
 */

/**
 * @typedef {object} SelfHostedNoAuthEndpoint
 * @property {'selfHosted'} type
 * @property {string} url
 */

/**
 * @typedef {object} SelfHostedOAuthEndpoint
 * @property {'oauth'} type
 * @property {string} url
 * @property {string} audience
 * @property {string} clientId
 * @property {string} clientSecret
 */

/**
 * @typedef {object} CamundaCloudEndpoint
 * @property {'camundaCloud'} type
 * @property {string} clusterId
 * @property {string} clientId
 * @property {string} clientSecret
 * @property {string} [clusterRegion] if not provided, zeebe-node will assume 'bru-2'
 */

/**
 * @typedef {object} TopologyResponse
 * @property {'brokers'} type
 * @property {number} clusterSize
 * @property {number} partitionsCount
 * @property {number} replicationFactor
 * @property {string} gatewayVersion
 */

class ZeebeAPI {
  constructor(fs, ZeebeNode, flags) {
    this._fs = fs;

    this._ZeebeNode = ZeebeNode;
    this._flags = flags;

    this._zeebeClient = null;
  }

  /**
   * @public
   * Check connection with given broker/cluster.
   *
   * @param {ZeebeClientParameters} parameters
   * @returns {{ success: boolean, reason?: string }}
   */
  async checkConnection(parameters) {

    const {
      endpoint
    } = parameters;

    const client = this._getZeebeClient(endpoint);

    try {
      await client.topology();
      return { success: true };
    } catch (err) {
      log.error('Failed to connect with config (secrets omitted):', withoutSecrets(parameters), err);

      return {
        success: false,
        reason: getErrorReason(err, endpoint)
      };
    }
  }

  /**
   * @public
   * Deploy workflow.
   *
   * @param {ZeebeClientParameters & { name: string, filePath: string }} parameters
   * @returns {{ success: boolean, response: object }}
   */
  async deploy(parameters) {

    const {
      endpoint,
      filePath,
      name,
      diagramType
    } = parameters;

    const {
      contents
    } = this._fs.readFile(filePath, { encoding: false });

    const client = this._getZeebeClient(endpoint);

    try {
      const response = await client.deployWorkflow({
        definition: contents,
        name: prepareDeploymentName(name, filePath, diagramType)
      });

      return {
        success: true,
        response: response
      };
    } catch (err) {
      log.error('Failed to deploy with config (secrets omitted):', withoutSecrets(parameters), err);

      return {
        success: false,
        response: asSerializedError(err)
      };
    }
  }

  /**
   * @public
   * Run process instance.
   *
   * @param {ZeebeClientParameters & { endpoint: object, processId: string, variables: object }} parameters
   * @returns {{ success: boolean, response: object }}
   */
  async run(parameters) {

    const {
      endpoint,
      variables,
      processId
    } = parameters;

    const client = this._getZeebeClient(endpoint);

    try {

      const response = await client.createWorkflowInstance({
        bpmnProcessId: processId,
        variables
      });

      return {
        success: true,
        response: response
      };
    } catch (err) {
      log.error('Failed to run instance with config (secrets omitted):', withoutSecrets(parameters), err);

      return {
        success: false,
        response: asSerializedError(err)
      };
    }
  }

  /**
   * @public
   * Get gateway version of given broker/cluster endpoint.
   *
   * @param {ZeebeClientParameters} parameters
   * @returns {{ success: boolean, response?: object, response?.gatewayVersion: string }}
   */
  async getGatewayVersion(parameters) {

    const {
      endpoint
    } = parameters;

    const client = this._getZeebeClient(endpoint);

    try {
      const topologyResponse = await client.topology();

      return {
        success: true,
        response: {
          gatewayVersion: topologyResponse.gatewayVersion
        }
      };
    } catch (err) {
      log.error('Failed to connect with config (secrets omitted):', withoutSecrets(parameters), err);

      return {
        success: false,
        reason: getErrorReason(err, endpoint)
      };
    }
  }

  _getCachedZeebeClient(endpoint) {
    const cachedEndpoint = this._cachedEndpoint;

    if (isHashEqual(endpoint, cachedEndpoint)) {
      return this._zeebeClient;
    }
  }

  _getZeebeClient(endpoint) {

    // (1) use existing Zeebe Client for endpoint
    const cachedZeebeClient = this._getCachedZeebeClient(endpoint);

    if (cachedZeebeClient) {
      return cachedZeebeClient;
    }

    // (2) cleanup old client instance
    this._shutdownZeebeClientInstance();

    // (3) create new Zeebe Client for endpoint configuration
    this._zeebeClient = this._createZeebeClient(endpoint);
    this._cachedEndpoint = endpoint;

    return this._zeebeClient;
  }

  _shutdownZeebeClientInstance() {
    this._zeebeClient && this._zeebeClient.close();
  }

  _createZeebeClient(endpoint) {
    const {
      type,
      url
    } = endpoint;

    let options = {
      retry: false
    };

    if (!values(endpointTypes).includes(type)) {
      return;
    }

    if (type === endpointTypes.OAUTH) {
      options = {
        ...options,
        oAuth: {
          url: endpoint.oauthURL,
          audience: endpoint.audience,
          clientId: endpoint.clientId,
          clientSecret: endpoint.clientSecret,
          cacheOnDisk: false
        },
        useTLS: true
      };
    } else if (type === endpointTypes.CAMUNDA_CLOUD) {
      options = {
        ...options,
        camundaCloud: {
          clientId: endpoint.clientId,
          clientSecret: endpoint.clientSecret,
          clusterId: endpoint.clusterId,
          cacheOnDisk: false,
          ...(endpoint.clusterRegion ? { clusterRegion: endpoint.clusterRegion } : {})
        },
        useTLS: true
      };
    }

    options = this._withTLSConfig(options);

    return new this._ZeebeNode.ZBClient(url, options);
  }

  _withTLSConfig(options) {
    const customCertificatePath = this._flags.get('zeebe-ssl-certificate');

    if (customCertificatePath) {
      try {
        const cert = this._fs.readFile(customCertificatePath, { encoding: false });

        return {
          ...options,
          useTLS: true,
          customSSL: {
            rootCerts: cert.contents
          }
        };
      } catch (err) {
        log.error('Failed to read custom SSL certificate:', err);
      }
    }

    return options;
  }
}

module.exports = ZeebeAPI;


// helpers //////////////////////

function getErrorReason(error, endpoint) {

  const {
    code,
    message
  } = error;

  const {
    type
  } = endpoint;

  // (1) handle grpc errors
  if (code === 14) {
    return (type === endpointTypes.CAMUNDA_CLOUD
      ? errorReasons.CLUSTER_UNAVAILABLE
      : errorReasons.CONTACT_POINT_UNAVAILABLE
    );
  } else if (code === 13 && type === endpointTypes.CAMUNDA_CLOUD) {
    return errorReasons.CLUSTER_UNAVAILABLE;
  } else if (code === 12) {
    return errorReasons.UNSUPPORTED_ENGINE;
  }

  // (2) handle <unknown>
  if (!message) {
    return errorReasons.UNKNOWN;
  }

  // (3) handle <not found>
  if (message.includes('ENOTFOUND') || message.includes('Not Found')) {
    if (type === endpointTypes.OAUTH) {
      return errorReasons.OAUTH_URL;
    } else if (type === endpointTypes.CAMUNDA_CLOUD) {
      return errorReasons.INVALID_CLIENT_ID;
    }

    return errorReasons.CONTACT_POINT_UNAVAILABLE;
  }

  // (4) handle other error messages
  if (message.includes('Unauthorized')) {
    return (type === endpointTypes.CAMUNDA_CLOUD
      ? errorReasons.INVALID_CREDENTIALS
      : errorReasons.UNAUTHORIZED
    );
  }

  if (message.includes('Forbidden')) {
    return errorReasons.FORBIDDEN;
  }

  if (message.includes('Unsupported protocol') && type === endpointTypes.OAUTH) {
    return errorReasons.OAUTH_URL;
  }

  return errorReasons.UNKNOWN;
}

function isHashEqual(parameter1, parameter2) {
  return JSON.stringify(parameter1) === JSON.stringify(parameter2);
}

function withoutSecrets(parameters) {
  const endpoint = pick(parameters.endpoint, [ 'type', 'url', 'clientId', 'oauthURL' ]);

  return { ...parameters, endpoint };
}

// With zeebe-node 0.23.0, the deployment name should end with
// .bpmn suffix.
//
// If name is empty, we'll return the file name. If name is not empty
// but does not end with .bpmn, we'll add the suffix.
/**
 * With zeebe-node 0.23.0, the deployment name should end with
 * file type appropriate suffix.
 *
 * If name is empty, we'll return the file name with suffix added. If name is not empty
 * but does not end with .bpmn, we'll add the suffix.
 * @param {string} name
 * @param {string} filePath
 * @param {'bpmn'|'dmn'} [suffix='bpmn']
 * @returns {`${string}.${'bpmn'|'dmn'}`}
 */
function prepareDeploymentName(name, filePath, suffix = 'bpmn') {

  try {
    if (!name || name.length === 0) {
      return `${path.basename(filePath, path.extname(filePath))}.${suffix}`;
    }

    if (!name.endsWith(suffix)) {
      return `${name}.${suffix}`;
    }

  } catch (err) {

    log.error('Error happened preparing deployment name: ', err);
  }

  return name;
}

function asSerializedError(error) {
  return pick(error, [ 'message', 'code', 'details' ]);
}

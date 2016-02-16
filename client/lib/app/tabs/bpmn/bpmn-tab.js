'use strict';

var inherits = require('inherits');

var assign = require('lodash/object/assign');

var BpmnEditor = require('./bpmn-editor'),
    XMLEditor = require('../../editor/xml-editor'),
    DiagramTab = require('../diagram-tab');


/**
 * A tab displaying a BPMN diagram.
 *
 * @param {Object} options
 */
function BpmnTab(options) {

  if (!(this instanceof BpmnTab)) {
    return new BpmnTab(options);
  }

  options = assign({
    viewDefinitions: [
      { id: 'diagram', label: 'Diagram', component: BpmnEditor },
      { id: 'xml', label: 'XML', component: XMLEditor }
    ]
  }, options);

  DiagramTab.call(this, options);
}

inherits(BpmnTab, DiagramTab);

module.exports = BpmnTab;
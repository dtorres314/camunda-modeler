/**
 * Copyright (c) Camunda Services GmbH.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

const defaultValue = {
  addFill() {},
  removeFill() {}
};

const FillContext = React.createContext(defaultValue);

export default FillContext;
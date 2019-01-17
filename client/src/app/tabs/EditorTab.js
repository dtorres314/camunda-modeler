import React, { Component } from 'react';

import MultiSheetTab from './MultiSheetTab';


export function createTab(tabName, providers) {

  class EditorTab extends Component {

    constructor() {
      super();

      this.tabRef = React.createRef();
    }

    triggerAction(action, options) {
      return this.tabRef.current.triggerAction(action, options);
    }

    componentDidMount() {
      const {
        tab
      } = this.props;

      this.props.onShown(tab);
    }

    render() {
      const {
        tab,
        onChanged
      } = this.props;

      return (
        <MultiSheetTab
          id={ tab.id }
          tab={ tab }
          xml={ tab.file.contents }
          onChanged={ onChanged }
          ref={ this.tabRef }
          providers={ providers } />
      );
    }

  }

  EditorTab.displayName = tabName;

  return EditorTab;
}
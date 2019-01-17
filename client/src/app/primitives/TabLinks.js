import React, { Component } from 'react';

import classNames from 'classnames';

import css from './Tabbed.less';

import {
  addScroller,
  removeScroller
} from '../util/scroller';

import {
  addDragger
} from '../util/dragger';

import {
  find,
  matchPattern
} from 'min-dash';

const noop = () => {};

const TABS_OPTS = {
  selectors: {
    tabsContainer: '.tabs-container',
    tab: '.tab',
    active: '.active',
    ignore: '.ignore'
  }
};


export default class TabLinks extends Component {
  constructor() {
    super();

    this.tabLinksRef = React.createRef();
  }

  componentDidMount() {
    const {
      draggable,
      scrollable
    } = this.props;

    if (draggable) {
      addDragger(this.tabLinksRef.current, TABS_OPTS, this.handleDrag);
    }

    if (scrollable) {
      this.scroller = addScroller(this.tabLinksRef.current, TABS_OPTS, this.handleScroll);
    }
  }

  componentWillUnmount() {
    if (this.scroller) {
      removeScroller(this.scroller);
    }
  }

  componentDidUpdate() {
    if (this.scroller) {
      this.scroller.update();
    }
  }

  handleScroll = (node) => {
    const {
      onSelect,
      tabs
    } = this.props;

    const tab = find(tabs, matchPattern({ id: node.dataset.tabId }));

    onSelect(tab);
  }

  handleDrag = ({ dragTab, newIndex }) => {
    const {
      tabs,
      onMoveTab
    } = this.props;

    const tab = find(tabs, matchPattern({ id: dragTab.dataset.tabId }));

    onMoveTab(tab, newIndex);
  }

  render() {

    const {
      activeTab,
      tabs,
      isDirty,
      onSelect,
      onContextMenu,
      onClose,
      onCreate,
      className
    } = this.props;

    return (
      <div
        className={ classNames(css.LinksContainer, className) }
        ref={ this.tabLinksRef }>
        <div className="tabs-container">
          {
            tabs.map(tab => {
              return (
                <span
                  key={ tab.id }
                  data-tab-id={ tab.id }
                  className={ classNames('tab', {
                    active: tab === activeTab,
                    dirty: isDirty && isDirty(tab)
                  }) }
                  onClick={ () => onSelect(tab, event) }
                  onContextMenu={ (event) => (onContextMenu || noop)(tab, event) }
                  draggable
                >
                  {tab.name}
                  {
                    onClose && <span
                      className="close"
                      onClick={ e => {
                        e.preventDefault();
                        e.stopPropagation();

                        onClose(tab);
                      } }
                    />
                  }
                </span>
              );
            })
          }

          {
            onCreate && <span
              key="empty-tab"
              className={ classNames('tab ignore', {
                active: tabs.length === 0
              }) }
              onClick={ () => onCreate() }
            >
              +
            </span>
          }
        </div>
      </div>
    );
  }
}
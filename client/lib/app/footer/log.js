'use strict';

var format = require('util').format;

var BaseComponent = require('base/component');

var inherits = require('inherits');

var ensureOpts = require('util/ensure-opts'),
    dragger = require('util/dom/dragger'),
    copy = require('util/copy'),
    isEscape = require('util/event/is-escape');


function Log(options) {

  BaseComponent.call(this);

  ensureOpts([ 'events', 'layout', 'log' ], options);

  var events = options.events;


  this.resizeLog = function onDrag(logLayout, event, delta) {

    var oldHeight = logLayout.open ? logLayout.height : 0;

    var newHeight = Math.max(oldHeight + delta.y * -1, 0);

    events.emit('layout:update', {
      log: {
        open: newHeight > 25,
        height: newHeight
      }
    });
  };

  this.closeOnEscape = function(event) {
    if (isEscape(event)) {
      this.toggleLog();
    }
  };

  this.toggleLog = function() {
    var entries = options.log.entries;

    events.emit('layout:update', {
      log: {
        open: !options.layout.log.open,
        cleared: !entries.length
      }
    });
  };

  this.clearLog = function() {
    options.log.clear();

    this.toggleLog();
  };

  this.render = function() {
    var clearButton;

    var entries = options.log.entries,
        logLayout = options.layout.log;

    var focusedEntry = entries[entries.length - 1];

    var logStyle = {
      height: (logLayout.open ? logLayout.height : 0) + 'px'
    };

    if (logLayout.open && (entries && entries.length)) {
      clearButton = (
        <div className="log-clear-container">
          <span className="separator"></span>
          <div className="log-clear" onClick={ this.compose('clearLog') }>Clear log</div>
        </div>
      );
    }

    return (
      <div className="log">
        <div className="header" >
          <div className="log-toggle" onClick={ this.compose('toggleLog') }>Log</div>
          { clearButton }
        </div>
        <div className="resize-handle"
             draggable="true"
             onDragStart={ dragger( this.compose('resizeLog', copy(logLayout))) }></div>
        {
          logLayout.open
            ? <div className="entries"
                   style={ logStyle }
                   tabIndex="0"
                   onKeydown={ this.compose('closeOnEscape') }>
                {
                  entries.map(function(e) {

                    var action = e.action;

                    var msg = format('%s  %s', '[' + e.category + ']', e.message);

                    if (!e.message) {
                      msg = ' ';
                    }

                    var html =
                      <div className="entry" scrollTo={ e === focusedEntry }>
                        {
                          action
                            ? <a href="#" onClick={ action }>{ msg }</a>
                            : <span>{ msg }</span>
                        }
                      </div>;

                    return html;
                  })
                }
              </div>
            : null
        }
      </div>
    );
  };
}

inherits(Log, BaseComponent);

module.exports = Log;

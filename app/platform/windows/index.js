'use strict';

var dialog = require('dialog');

var Menus = require('../Menus');

var FileAssociations = require('./FileAssociations'),
    parseUtil = require('../../util/parse');

var FILE_ASSOCIATION_KEY = 'fileAssociation';


function WindowsIntegration(app, config) {
  // close handling
  app.on('window-all-closed', function () {
    app.quit();
  });

  // check + setup file associations
  app.on('editor-open', function(browserWindow) {
    checkFileAssociations(app, config);
  });

  // editor menu
  app.on('editor-create-menu', function(mainWindow, notation) {
    var positions = {
      edit: 1
    };

    new Menus(mainWindow, notation, positions);
  });

  // modeler was opened through file association
  app.on('association-file-open', function() {
    var filePath = process.argv[1];

    if (parseUtil.hasExtension(filePath)) {
      app.fileSystem.addFile(filePath);
    }
  });

  app.on('editor-add-recent', function(path) {
    app.addRecentDocument(path);
  });
}

module.exports = WindowsIntegration;


/**
 * Check application file associations and
 * initialize/update as needed.
 *
 * @param {ElectronApp} app
 * @param {Config} config
 */
function checkFileAssociations(app, config) {

  var executablePath = app.getPath('exe');

  var userChoice = config.get(FILE_ASSOCIATION_KEY);

  needsAssociation(userChoice, function(err, associate) {

    if (associate) {

      associateEditor(executablePath, function(err) {
        // haha, don't care
      });
    }

    config.set(FILE_ASSOCIATION_KEY, associate);
  });
}


function needsAssociation(existingChoice, done) {

  if (existingChoice !== undefined) {
    return done(null, existingChoice);
  } else {
    suggestFileAssociation(done);
  }
}

function associateEditor(executablePath, done) {

  try {
    FileAssociations.register(executablePath);
  } catch (e) {
    return done(e);
  }

  done(null);
}

function suggestFileAssociation(done) {
  dialog.showMessageBox({
    type: 'question',
    buttons: [ 'Yes', 'No' ],
    title: 'Camunda Modeler',
    message: 'Do you want to associate your .bpmn files to the Camunda Modeler ?'
  }, function(answer) {
    // return true, if the user agreed
    done(null, answer === 0);
  });
}

class PropertiesPanel {
  attachTo() {}

  detach() {}
}

export default class Modeler {
  constructor() {
    this.xml = null;
  }

  importXML(xml, done) {
    this.xml = xml;

    const error = xml === 'import-error' ? new Error('failed to import xml') : null;

    done && done(error);
  }

  saveXML(options, done) {

    const xml = this.xml;

    if (xml === 'export-error') {
      return done(new Error('failed to save xml'));
    }

    return done(null, xml);
  }

  saveSVG(done) {

    if (this.xml === 'export-as-error') {
      return done(new Error('failed to save svg'));
    }

    return done(null, '<svg />');
  }

  attachTo() {}

  detach() {}

  on() {}

  off() {}

  get(module) {
    if (module === 'propertiesPanel') {
      return new PropertiesPanel();
    }

    if (module === 'minimap') {
      return {
        toggle() {}
      };
    }

    if (module === 'canvas') {
      return {
        resized() { }
      };
    }

    return null;
  }
}

Modeler.prototype._modules = [];
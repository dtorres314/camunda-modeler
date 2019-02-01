'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const ElectronApp = require('../../helper/mock/electron-app');
const ElectronMenu = require('../../helper/mock/electron-menu');
const ElectronMenuItem = require('../../helper/mock/electron-menu-item');

const Electron = {
  app: ElectronApp,
  Menu: ElectronMenu,
  MenuItem: ElectronMenuItem
};

const MenuBuilder = proxyquire('../../../lib/menu/menu-builder.js', {
  electron: Electron
});


describe('MenuBuilder', () => {

  it('should instantiate', () => {
    const menuBuilder = new MenuBuilder();

    expect(menuBuilder).to.exist;
  });


  it('should build menu', () => {
    const menuBuilder = new MenuBuilder();

    const menu = menuBuilder.build();

    expect(menu).to.exist;
  });


  it('should build context menu', () => {
    const menuBuilder = new MenuBuilder({ type: 'tab' });

    const contextMenu = menuBuilder.buildContextMenu();

    expect(contextMenu).to.exist;
  });


  describe('plugins menu', function() {

    it('should accept callable values for enabled', () => {
      // given
      const pluginName = 'test';
      const menuStub = sinon.stub().returns([
        {
          label: 'label',
          enabled: () => false
        }
      ]);

      const options = getOptionsWithPlugins({
        test: {
          name: pluginName,
          menu: menuStub
        }
      });

      const menuBuilder = new MenuBuilder(options);

      // when
      const { menu } = menuBuilder.build();

      // then
      const plugins = menu.find(item => item.label === 'Plugins');
      const pluginMenu = plugins.submenu.find(plugin => plugin.label === pluginName);

      expect(pluginMenu).to.exist;
      expect(pluginMenu.submenu).to.be.an('Array').and.have.lengthOf(1);
      expect(pluginMenu.submenu[0]).to.have.property('enabled').which.is.false;
    });


    it('should accept non-callable values for enabled', () => {
      // given
      const pluginName = 'test';
      const menuStub = sinon.stub().returns([
        {
          label: 'label',
          enabled: false
        }
      ]);

      const options = getOptionsWithPlugins({
        test: {
          name: pluginName,
          menu: menuStub
        }
      });

      const menuBuilder = new MenuBuilder(options);

      // when
      const { menu } = menuBuilder.build();

      // then
      const plugins = menu.find(item => item.label === 'Plugins');
      const pluginMenu = plugins.submenu.find(plugin => plugin.label === pluginName);

      expect(pluginMenu).to.exist;
      expect(pluginMenu.submenu).to.be.an('Array').and.have.lengthOf(1);
      expect(pluginMenu.submenu[0]).to.have.property('enabled').which.is.false;
    });


    it('should properly handle plugin menu error', function() {
      // given
      const pluginName = 'test';
      const menuStub = sinon.stub().throwsException();

      const options = getOptionsWithPlugins({
        test: {
          name: pluginName,
          menu: menuStub
        }
      });

      const menuBuilder = new MenuBuilder(options);

      // then
      expect(() => menuBuilder.build(), 'Menu builder should build the menu').to.not.throw();
    });


    it('should properly handle plugin menu item action error', function() {
      // given
      const pluginName = 'test';
      const actionStub = sinon.stub().throwsException();
      const menuStub = sinon.stub().returns([
        {
          label: 'label',
          enabled: false,
          action: actionStub
        }
      ]);

      const options = getOptionsWithPlugins({
        test: {
          name: pluginName,
          menu: menuStub
        }
      });

      const menuBuilder = new MenuBuilder(options);

      // when
      const { menu } = menuBuilder.build();

      // then
      const plugins = menu.find(item => item.label === 'Plugins');
      const pluginMenu = plugins.submenu.find(plugin => plugin.label === pluginName);
      const { click: action } = pluginMenu.submenu[0];

      expect(action).to.exist;
      expect(() => action(), 'Assigned action should handle the error').to.not.throw();
      expect(actionStub).to.be.called;
    });

  });

});



// helper /////////
function getOptionsWithPlugins(plugins) {
  return {
    providers: {
      plugins: {
        helpMenu: [],
        newFileMenu: [],
        plugins,
      }
    }
  };
}

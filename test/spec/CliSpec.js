'use strict';

var Cli = require('../../app/Cli');

var path = require('path');


describe('cli', function() {

  describe('#extractFiles', function() {

    it('parse Linux args', function() {

      // given
      var args = [ 'app', '--enable-logging', '../fixtures/random.xml' ];

      // when
      var files = Cli.extractFiles(args, __dirname);

      // then
      expect(files).to.eql([ path.resolve('test/fixtures/random.xml') ]);
    });


    it('parse Linux args, extra parameters', function() {

      // given
      var args = [ 'app', '../fixtures/random.xml' ];

      // when
      var files = Cli.extractFiles(args, __dirname);

      // then
      expect(files).to.eql([ path.resolve('test/fixtures/random.xml') ]);
    });


    if (process.platform === 'win32') {

      it('parse Windows args', function() {

        // given
        var args = [ 'app', '--', '..\\fixtures\\random.xml' ];

        // when
        var files = Cli.extractFiles(args, __dirname);

        // then
        expect(files).to.eql([ path.resolve('test/fixtures/random.xml') ]);
      });


      it('parse Windows args, double backslash', function() {

        // given
        var args = [ 'app', '--', '..\\\\fixtures\\\\random.xml' ];

        // when
        var files = Cli.extractFiles(args, __dirname);

        // then
        expect(files).to.eql([ path.resolve('test/fixtures/random.xml') ]);
      });
    } else {
      it.skip('parse Windows args');

      it.skip('parse Windows args, double backslash');
    }
  });

});
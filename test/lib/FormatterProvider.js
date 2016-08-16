'use strict';

const assert = require('assert');
const ServiceLocator = require('catberry-locator');
const FormatterProvider = require('../../lib/FormatterProvider');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
/* eslint no-sync: 0 */
/* eslint no-underscore-dangle: 0 */
describe('lib/FormatterProvider', () => {

  let locator = null;
  let formatterProvider = null;

  beforeEach(() => {
    locator = new ServiceLocator();
    locator.register('formatterProvider', FormatterProvider);
    formatterProvider = locator.resolve('formatterProvider');
  });

  it('default', () => {
    formatterProvider._prepareFormatters();
    assert.equal(Object.keys(formatterProvider.formatters).length, 3);
  });

  it('user replace default', () => {
    locator.registerInstance('formatter', {
      'application/json; q=0.9'() {}
    });

    formatterProvider._prepareFormatters();
    assert.equal(Object.keys(formatterProvider.formatters).length, 3);
  });

  it('user add formatter', () => {
    locator.registerInstance('formatter', {
      'application/vnd.my.awesome.api+json; q=0.9'() {}
    });

    formatterProvider._prepareFormatters();
    assert.equal(Object.keys(formatterProvider.formatters).length, 4);
  });
});

'use strict';

/* eslint-env node, mocha */

const assert = require('assert');
const Locator = require('catberry-locator');
const locator = new Locator();
const ContextFactory = require('../../../lib/context/ContextFactory');

/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/context/ContextFactory', () => {
  it('#create', () => {
    const factory = new ContextFactory(locator);
    const args = [
      {
        getLocation: () => {},
        getHeader: () => {}
      },
      'response',
      {
        foo: 'Bar'
      }
    ];

    const context = factory.create(...args);

    Object.isFrozen(context);

    assert.deepEqual(context.request, args[0]);
    assert.equal(context.response, 'response');
    assert.equal(context.foo, 'Bar');
  });
});

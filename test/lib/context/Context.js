'use strict';

/* eslint-env node, mocha */

const assert = require('assert');
const Locator = require('catberry-locator');
const EventEmitter = require('events').EventEmitter;
const ContextFactory = require('../../../lib/context/ContextFactory');

/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/context/Context', () => {
  let locator;

  beforeEach(() => {
    locator = new Locator();
    locator.register('events', EventEmitter, true);
  });

  it('#forward', () => {
    const factory = new ContextFactory(locator);
    const args = [
      {
        getLocation: () => {},
        getHeader: () => {}
      },
      'response'
    ];

    const context = factory.create(...args);

    context.forward('collection', 'handle');

    assert.deepEqual(context.actions.forward, {collectionName: 'collection', handleName: 'handle'});
  });

  it('#notFound', () => {
    const factory = new ContextFactory(locator);
    const args = [
      {
        getLocation: () => {},
        getHeader: () => {}
      },
      'response'
    ];

    const context = factory.create(...args);

    context.notFound('Document not found', 'NF001');

    assert.deepEqual(context.actions.notFound, {message: 'Document not found', code: 'NF001'});
  });
});

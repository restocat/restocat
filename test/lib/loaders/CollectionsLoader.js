'use strict';

const assert = require('assert');
const EventEmitter = require('events').EventEmitter;
const testCases = require('../../cases/lib/loaders/CollectionsLoader/test-cases.json');
const ServiceLocator = require('catberry-locator');
const CollectionsLoader = require('../../../lib/loaders/CollectionsLoader');
const ContextFactory = require('../../../lib/context/ContextFactory');
const CollectionsFinder = require('../../mocks/finders/CollectionsFinder');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/loaders/CollectionsLoader', () => {
  testCases.load.forEach(testCase => {
    it(testCase.name, () => {
      const locator = createLocator(testCase.components);
      const loader = locator.resolve('collectionsLoader');

      return loader
        .load()
        .then(loadedCollections => {
          // loader should cache the components
          assert.strictEqual(loadedCollections, loader.getCollectionsByNames());

          const collectionsNames = Object.keys(loadedCollections);
          assert.strictEqual(collectionsNames.length, testCase.expectedCount);

          collectionsNames.forEach(collectionName => {
            const collection = loadedCollections[collectionName];
            const expected = testCase.components[collectionName];
            assert.strictEqual(collection.name, expected.name);
            assert.strictEqual(collection.path, expected.path);
            assert.deepEqual(collection.properties, expected.properties);
            assert.strictEqual(typeof (collection.constructor), 'function');
          });
        });
    });
  });
});

function createLocator(components) {
  const locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('config', {isRelease: true});

  const events = new EventEmitter();
  events.on('error', () => {});

  locator.registerInstance('events', events);
  locator.registerInstance('collectionsFinder', new CollectionsFinder(components));
  locator.register('contextFactory', ContextFactory);
  locator.register('collectionsLoader', CollectionsLoader);
  return locator;
}

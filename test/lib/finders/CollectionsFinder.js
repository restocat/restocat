const assert = require('assert');
const path = require('path');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const CollectionFinder = require('../../../lib/finders/CollectionsFinder');
const cwd = process.cwd();

const CASE_PATH = path.join('test', 'cases', 'lib', 'finders', 'CollectionsFinder');

const EXPECTED_PATH = path.join(
  cwd, CASE_PATH, 'expected.json'
);
const EXPECTED = require(EXPECTED_PATH);

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
/* eslint no-sync: 0 */
describe('lib/CollectionsFinder', () => {
  let locator;

  beforeEach(() => {
    locator = new ServiceLocator();
    locator.registerInstance('serviceLocator', locator);
    locator.registerInstance('events', new events.EventEmitter());
    locator.register('componentsFinder', CollectionFinder);
  });

  describe('#find', () => {
    it('should find all valid collections', async() => {
      locator.registerInstance('config', {
        collectionsGlob: 'test/cases/lib/finders/CollectionsFinder/collections/**/test-collection.json'
      });

      const finder = locator.resolve('componentsFinder');
      const found = await finder.find();

      assert.deepEqual(found, EXPECTED);
    });

    it('should find all valid collections by globs array', async() => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/collections';

      locator.registerInstance('config', {
        collectionsGlob: [
          `${caseRoot}/test1/**/test-collection.json`,
          `${caseRoot}/test1/test-collection.json`,
          `${caseRoot}/test3/**/test-collection.json`,
          `${caseRoot}/test3/test-collection.json`
        ]
      });

      const finder = locator.resolve('componentsFinder');
      const found = await finder.find();

      assert.deepEqual(found, EXPECTED);
    });

    it('should find all valid collections by globs array', async() => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/collections';

      locator.registerInstance('config', {
        collectionsGlob: [
          `${caseRoot}/test1/**/test-collection.json`,
          `${caseRoot}/test1/test-collection.json`,
          `${caseRoot}/test3/**/test-collection.json`,
          `${caseRoot}/test3/test-collection.json`
        ]
      });

      const finder = locator.resolve('componentsFinder');
      const found = await finder.find();

      assert.deepEqual(found, EXPECTED);
    });

    it('should ignore a collection when colleciton.json is invalid', async() => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/errorCollectionJson';

      locator.registerInstance('config', {
        collectionsGlob: [
          `${caseRoot}/**/test-collection.json`,
          `${caseRoot}/test-collection.json`
        ]
      });

      const events = locator.resolve('events');
      const errorAwait = new Promise(resolve => events.on('error', error => resolve(error)));
      const finder = locator.resolve('componentsFinder');

      await finder.find();

      const error = await errorAwait;

      assert.equal(error.name, 'SyntaxError');
    });
  });

  describe('#recognizeCollection', () => {
    it('should find all valid collections', async() => {
      const file = 'test/cases/lib/finders/CollectionsFinder/collections/test1/test2/test-collection.json';
      const expectedName = 'cool';

      locator.registerInstance('config', {
        collectionsGlob: 'test/cases/lib/finders/CollectionsFinder/collections/**/test-collection.json'
      });

      const finder = locator.resolve('componentsFinder');
      await finder.find();

      const descriptor = finder.recognizesCollection(file);

      assert.equal(descriptor.name, expectedName);
    });
  });

  describe('#removeCollection', () => {
    it('should find all valid collections', async() => {
      locator.registerInstance('config', {
        collectionsGlob: 'test/cases/lib/finders/CollectionsFinder/collections/**/test-collection.json'
      });

      const finder = locator.resolve('componentsFinder');
      const found = await finder.find();
      const descriptor = Object.values(found)[0];

      finder.removeCollection(descriptor);

      assert.equal(finder.recognizesCollection(descriptor.path), null);

      const withoutFirst = await finder.find();

      assert.equal(withoutFirst[descriptor.name], undefined);
    });
  });
});

const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const utils = require('../../utils');
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
  describe('#find', () => {
    let locator;

    beforeEach(() => {
      locator = new ServiceLocator();
      locator.registerInstance('serviceLocator', locator);
      locator.registerInstance('events', new events.EventEmitter());
      locator.register('componentsFinder', CollectionFinder);
    });

    it('should find all valid collections', () => {
      locator.registerInstance('config', {
        collectionsGlob: 'test/cases/lib/finders/CollectionsFinder/collections/**/test-collection.json'
      });

      const finder = locator.resolve('componentsFinder');

      return finder
        .find()
        .then(found => assert.deepEqual(found, EXPECTED));
    });

    it('should find all valid collections by globs array', () => {
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

      return finder
        .find()
        .then(found => assert.deepEqual(found, EXPECTED));
    });
  });
});

'use strict';

const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const utils = require('../../utils');
const CollectionFinder = require('../../../lib/finders/CollectionsFinder');

const CASE_PATH = path.join('test', 'cases', 'lib', 'finders', 'CollectionsFinder');

const EXPECTED_PATH = path.join(
  process.cwd(), CASE_PATH, 'expected.json'
);
const EXPECTED = require(EXPECTED_PATH);

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
/*  eslint no-sync: 0 */
describe('lib/CollectionsFinder', () => {
  describe('#find', () => {
    it('should find all valid collections', () => {
      const locator = createLocator();
      locator.registerInstance('config', {
        collectionsGlob: 'test/cases/lib/finders/CollectionsFinder/collections/**/test-collection.json'
      });

      const finder = locator.resolve('componentsFinder');

      return finder
        .find()
        .then(found => assert.deepEqual(found, EXPECTED));
    });
    it('should find all valid collections by globs array', () => {
      const locator = createLocator();
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

  describe('#watch', () => {
    it('should recreate collection after change collection.json', () => {
      const locator = createLocator();
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const alreadyPath = path.join(process.cwd(), caseRoot, 'already', 'test-collection.json');
      const collectionJsonContent = JSON.parse(fs.readFileSync(alreadyPath));

      locator.registerInstance('config', {
        collectionsGlob: [
          `${caseRoot}/**/test-collection.json`
        ]
      });

      const finder = locator.resolve('componentsFinder');

      return finder.find()
        .then(collections => {
          assert.equal(Object.keys(collections).length, 1);

          finder.watch();

          const watchers = finder.getWatchers();
          const defer = Promise.defer();

          finder.on('add', collection => {
            try {
              assert.equal(collection.name, collections[Object.keys(collections)[0]].name);

              watchers.collectionJson.close();
              watchers.collections.close();

              defer.resolve();
            } catch (e) {
              defer.reject(e);
            }
          });

          locator.resolve('events').on('error', error => done(error));

          collectionJsonContent.timestamp = Date.now();
          fs.writeFile(alreadyPath, JSON.stringify(collectionJsonContent), () => {
            delete collectionJsonContent.timestamp;
            fs.writeFileSync(alreadyPath, JSON.stringify(collectionJsonContent));
          });

          return defer.promise;
        })
        .catch(reason => {
          delete collectionJsonContent.timestamp;
          fs.writeFileSync(alreadyPath, JSON.stringify(collectionJsonContent));

          throw reason;
        });
    });

    it('should add new collection', () => {
      const locator = createLocator();
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const anotherCollection = 'test/cases/lib/finders/CollectionsFinder/collections/test1/test2';
      const fullPathAnother = path.join(process.cwd(), anotherCollection);
      const fullPathNew = path.join(process.cwd(), caseRoot, 'newCollection');

      locator.registerInstance('config', {
        collectionsGlob: [
          `${caseRoot}/**/test-collection.json`
        ]
      });

      const finder = locator.resolve('componentsFinder');

      return finder.find()
        .then(collections => {
          assert.equal(Object.keys(collections).length, 1);

          finder.watch();

          const watchers = finder.getWatchers();
          const defer = Promise.defer();

          finder.on('add', () => {
            watchers.collectionJson.close();
            watchers.collections.close();

            finder.find()
              .then(collections => {
                assert.equal(Object.keys(collections).length, 2);
                defer.resolve();
              })
              .catch(reason => defer.reject(reason));
          });

          locator.resolve('events').on('error', reason => defer.reject(reason));

          fs.copy(fullPathAnother, fullPathNew);

          return defer.promise;
        })
        .then(() => fs.removeSync(fullPathNew))
        .catch(reason => {
          fs.removeSync(fullPathNew);
          throw reason;
        });
    });

    it('skip collection with equal name', () => {
      const locator = createLocator();
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const anotherCollection = 'test/cases/lib/finders/CollectionsFinder/collections/test1/test2';
      const fullPathAnother = path.join(process.cwd(), anotherCollection);
      const fullPathNew = path.join(process.cwd(), caseRoot, 'newCollection');
      const fullPathNewDuplicate = path.join(process.cwd(), caseRoot, 'newCollectionDuplicate');

      locator.registerInstance('config', {
        collectionsGlob: [
          `${caseRoot}/**/test-collection.json`
        ]
      });

      const finder = locator.resolve('componentsFinder');

      return finder.find()
        .then(collections => {
          assert.equal(Object.keys(collections).length, 1);

          finder.watch();

          const watchers = finder.getWatchers();
          const defer = Promise.defer();

          locator.resolve('events').on('warn', message => {
            watchers.collectionJson.close();
            watchers.collections.close();

            finder.find()
              .then(collections => {
                assert.notEqual(-1, message.indexOf('skipping'));
                assert.equal(Object.keys(collections).length, 2);
                defer.resolve();
              })
              .catch(reason => defer.reject(reason));
          });
          locator.resolve('events').on('error', reason => defer.reject(reason));

          fs.copy(fullPathAnother, fullPathNew);
          fs.copy(fullPathAnother, fullPathNewDuplicate);

          return defer.promise;
        })
        .then(() => {
          fs.removeSync(fullPathNew);
          fs.removeSync(fullPathNewDuplicate);
        })
        .catch(reason => {
          fs.removeSync(fullPathNew);
          fs.removeSync(fullPathNewDuplicate);

          throw reason;
        });
    });
  });
});

function createLocator() {
  const locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('events', new events.EventEmitter());
  locator.register('componentsFinder', CollectionFinder);

  return locator;
}

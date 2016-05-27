'use strict';

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
      const tmpPath = path.normalize(path.join(caseRoot, '../tmp'));
      const alreadyPath = path.join(cwd, tmpPath, 'already', 'test-collection.json');
      const fullTmpPath = path.join(cwd, tmpPath);

      locator.registerInstance('config', {
        collectionsGlob: [
          `${tmpPath}/**/test-collection.json`
        ]
      });

      const finder = locator.resolve('componentsFinder');
      let watchers, collections;

      return promisify(fs.copy)(path.join(cwd, caseRoot), fullTmpPath)
        .then(() => finder.find())
        .then(found => {
          collections = found;

          assert.equal(Object.keys(collections).length, 1);

          finder.watch();

          watchers = finder.getWatchers();

          return eventPromisify(watchers.collectionJson.on, watchers.collectionJson)('ready');
        })
        .then(() => {
          const promise = eventPromisify(finder.on, finder)('add')
            .then(collection => {
              assert.equal(collection.name, collections[Object.keys(collections)[0]].name);

              watchers.collectionJson.close();
              watchers.collections.close();
            });

          locator.resolve('events').on('error', error => done(error));

          const collectionJsonContent = JSON.parse(fs.readFileSync(alreadyPath));

          collectionJsonContent.timestamp = Date.now();

          fs.writeFileSync(alreadyPath, JSON.stringify(collectionJsonContent));

          return promise;
        })
        .then(() => fs.removeSync(fullTmpPath))
        .catch(reason => {
          fs.removeSync(fullTmpPath);
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
      let collections, watchers;

      return finder.find()
        .then(found => {
          collections = found;

          assert.equal(Object.keys(collections).length, 1);

          finder.watch();

          watchers = finder.getWatchers();

          return eventPromisify(watchers.collectionJson.on, watchers.collectionJson)('ready');
        })
        .then(() => {
          const promise = eventPromisify(finder.on, finder)('add')
            .then(() => {
              watchers.collectionJson.close();
              watchers.collections.close();

              return finder.find().then(collections => assert.equal(Object.keys(collections).length, 2));
            });

          return Promise.all([promisify(fs.copy)(fullPathAnother, fullPathNew), promise]);
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
      let collections, watchers;

      return finder.find()
        .then(found => {
          collections = found;

          assert.equal(Object.keys(collections).length, 1);

          finder.watch();

          watchers = finder.getWatchers();

          return Promise.all([
            eventPromisify(watchers.collectionJson.on, watchers.collectionJson)('ready'),
            eventPromisify(watchers.collections.on, watchers.collections)('ready')
          ]);
        })
        .then(() => {
          const events = locator.resolve('events');

          const promise = eventPromisify(events.on, events)('warn')
            .then(message => {
              watchers.collectionJson.close();
              watchers.collections.close();

              return finder.find()
                .then(collections => {
                  assert.notEqual(-1, message.indexOf('skipping'));
                  assert.equal(Object.keys(collections).length, 2);
                });
            });

          return Promise.all([
            promisify(fs.copy)(fullPathAnother, fullPathNew),
            promisify(fs.copy)(fullPathAnother, fullPathNewDuplicate),
            promise
          ]);

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

function promisify(original, thisArg) {
  return (...args) => {
    const def = Promise.defer();

    args.push((err, ...args) => err ? def.reject(err) : def.resolve(args));

    if (thisArg) {
      original.apply(thisArg, args);
    } else {
      original(...args);
    }

    return def.promise;
  };
}

function eventPromisify(original, thisArg) {
  return (...args) => {
    const def = Promise.defer();

    args.push((...args) => def.resolve(...args));

    if (thisArg) {
      original.apply(thisArg, args);
    } else {
      original(...args);
    }

    return def.promise;
  };
}

function createLocator() {
  const locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('events', new events.EventEmitter());
  locator.register('componentsFinder', CollectionFinder);

  return locator;
}

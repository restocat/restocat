'use strict';

const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const utils = require('../utils');
const CollectionsFinder = require('../../lib/finders/CollectionsFinder');
const CollectionsLoader = require('../../lib/loaders/CollectionsLoader');
const promisify = require('../../lib/helpers/promises').promisify;
const cwd = process.cwd();
const Watcher = require('../../lib/Watcher');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
/* eslint no-sync: 0 */
describe('lib/Watcher', () => {

  describe('#watchCollectionJsonFiles', () => {
    let locator;

    beforeEach(() => {
      locator = new ServiceLocator();
      locator.registerInstance('serviceLocator', locator);
      locator.registerInstance('events', new events.EventEmitter());
      locator.register('collectionsFinder', CollectionsFinder, true);
      locator.register('watcher', Watcher, true);
    });

    it('should recreate collection after change collection.json', () => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const tmpPath = path.normalize(path.join(caseRoot, '../tmp'));
      const alreadyPath = path.join(cwd, tmpPath, 'already', 'test-collection.json');
      const fullTmpPath = path.join(cwd, tmpPath);

      locator.registerInstance('config', {
        isRelease: true,
        collectionsGlob: [
          `${tmpPath}/**/test-collection.json`
        ]
      });

      const finder = locator.resolve('collectionsFinder');
      const watcher = locator.resolve('watcher');

      let collections;

      return promisify(fs.copy)(path.join(cwd, caseRoot), fullTmpPath)
        .then(() => finder.find())
        .then(found => {
          collections = found;

          assert.equal(Object.keys(collections).length, 1);

          return watcher.watchCollectionJsonFiles();
        })
        .then(jsonWatcher => {
          const promise = new Promise((fulfill, reject) => {
            jsonWatcher.on('error', reject);
            watcher.on('add', collection => {
              assert.equal(collection.name, collections[Object.keys(collections)[0]].name);

              jsonWatcher.close();

              fulfill();
            });
          });

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
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const anotherCollection = 'test/cases/lib/finders/CollectionsFinder/collections/test1/test2';
      const fullPathAnother = path.join(process.cwd(), anotherCollection);
      const fullPathNew = path.join(process.cwd(), caseRoot, 'newCollection');

      locator.registerInstance('config', {
        isRelease: true,
        collectionsGlob: [
          `${caseRoot}/**/test-collection.json`
        ]
      });

      const finder = locator.resolve('collectionsFinder');
      const watcher = locator.resolve('watcher');
      let collections, watchers;

      return finder.find()
        .then(found => {
          collections = found;

          assert.equal(Object.keys(collections).length, 1);

          return watcher.watchCollectionJsonFiles();
        })
        .then(jsonWatcher => {
          const promise = new Promise((fulfill, reject) => {
            jsonWatcher.once('error', reject);
            jsonWatcher.once('add', () => {
              jsonWatcher.close();

              fulfill(finder.find());
            });
          });

          return Promise.all([promisify(fs.copy)(fullPathAnother, fullPathNew), promise]);
        })
        .then(data => assert.equal(Object.keys(data[1]).length, 2))
        .then(() => fs.removeSync(fullPathNew))
        .catch(reason => {
          fs.removeSync(fullPathNew);
          throw reason;
        });
    });

    it('skip collection with equal name', () => {
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

      const finder = locator.resolve('collectionsFinder');
      const watcher = locator.resolve('watcher');

      let collections;

      return finder.find()
        .then(found => {
          collections = found;

          assert.equal(Object.keys(collections).length, 1);

          return watcher.watchCollectionJsonFiles();
        })
        .then(jsonWatcher => {
          const events = locator.resolve('events');
          let promise = new Promise(fulfill => {
            events.on('warn', message => {
              assert.notEqual(-1, message.indexOf('skipping'));

              jsonWatcher.close();

              fulfill();
            });
          });

          promise = promise
            .then(() => finder.find().then(collections => assert.equal(Object.keys(collections).length, 2)));

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

  describe('#watchLogicFiles', () => {
    let locator;

    beforeEach(() => {
      locator = new ServiceLocator();
      locator.registerInstance('serviceLocator', locator);
      locator.registerInstance('events', new events.EventEmitter());
      locator.register('collectionsFinder', CollectionsFinder, true);
      locator.register('watcher', Watcher, true);
    });

    it('should emit "change" collection after change "collection/index.js"', () => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const tmpPath = path.normalize(path.join(caseRoot, '../tmp'));
      const alreadyPath = path.join(cwd, tmpPath, 'already', 'index.js');
      const fullTmpPath = path.join(cwd, tmpPath);

      locator.registerInstance('config', {
        collectionsGlob: [
          `${tmpPath}/**/test-collection.json`
        ]
      });

      const finder = locator.resolve('collectionsFinder');
      const watcher = locator.resolve('watcher');

      let collections;

      return promisify(fs.copy)(path.join(cwd, caseRoot), fullTmpPath)
        .then(() => finder.find())
        .then(found => {
          collections = found;

          assert.equal(Object.keys(collections).length, 1);

          return watcher.watchLogicFiles();
        })
        .then(logicWatcher => {
          const promise = new Promise((fulfill, reject) => {
            logicWatcher.on('error', reject);
            watcher.on('change', data => {
              assert.equal(data.collection.name, collections[Object.keys(collections)[0]].name);

              const Logic = require(alreadyPath);
              const logic = new Logic();

              assert.equal(logic.foo(), 'foo');

              logicWatcher.close();

              fulfill();
            });
          });

          let collectionJsonContent = fs.readFileSync(alreadyPath).toString();

          collectionJsonContent = collectionJsonContent.replace(/blablabla/, 'foo');

          fs.writeFileSync(alreadyPath, collectionJsonContent);

          return promise;
        })
        .then(() => fs.removeSync(fullTmpPath))
        .catch(reason => {
          fs.removeSync(fullTmpPath);
          throw reason;
        });
    });

    it('should emit "change" collection after add file to collection', () => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const tmpPath = path.normalize(path.join(caseRoot, '../tmp'));
      const anotherPath = path.join(tmpPath, 'already', 'AnotherForAlready.js');
      const copyPath = path.join(tmpPath, 'customs', 'AnotherForAlready.js');
      const fullTmpPath = tmpPath;

      locator.registerInstance('config', {
        collectionsGlob: [
          `${tmpPath}/**/test-collection.json`
        ]
      });

      const finder = locator.resolve('collectionsFinder');
      const watcher = locator.resolve('watcher');

      let collections;

      return promisify(fs.copy)(path.join(cwd, caseRoot), fullTmpPath)
        .then(() => finder.find())
        .then(found => {
          collections = found;

          assert.equal(Object.keys(collections).length, 1);

          return watcher.watchLogicFiles();
        })
        .then(logicWatcher => {
          const promise = new Promise((fulfill, reject) => {
            logicWatcher.on('error', reject);
            watcher.on('change', data => {
              assert.equal(data.filename, anotherPath);
              logicWatcher.close();
              fulfill();
            });
          });

          fs.copy(copyPath, anotherPath);

          return promise;
        })
        .then(() => fs.removeSync(fullTmpPath))
        .catch(reason => {
          fs.removeSync(fullTmpPath);
          throw reason;
        });
    });

    it('should emit "unlink" collection after remove logic file', () => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const tmpPath = path.normalize(path.join(caseRoot, '../tmp'));
      const alreadyPath = path.join(cwd, tmpPath, 'already', 'index.js');
      const fullTmpPath = path.join(cwd, tmpPath);

      locator.registerInstance('config', {
        collectionsGlob: [
          `${tmpPath}/**/test-collection.json`
        ]
      });

      const finder = locator.resolve('collectionsFinder');
      const watcher = locator.resolve('watcher');

      let collections;

      return promisify(fs.copy)(path.join(cwd, caseRoot), fullTmpPath)
        .then(() => finder.find())
        .then(found => {
          collections = found;

          assert.equal(Object.keys(collections).length, 1);

          return watcher.watchLogicFiles();
        })
        .then(logicWatcher => {
          let promise = new Promise((fulfill, reject) => {
            logicWatcher.on('error', reject);

            watcher.on('unlink', () => {
              logicWatcher.close();
              fulfill();
            });
          });

          promise = promise
            .then(() => finder.find())
            .then(found => assert.equal(Object.keys(collections).length, 0));

          fs.removeSync(alreadyPath);

          return promise;
        })
        .then(() => fs.removeSync(fullTmpPath))
        .catch(reason => {
          fs.removeSync(fullTmpPath);
          throw reason;
        });
    });
  });

  describe('#watchCollections', () => {
    let locator;

    beforeEach(() => {
      locator = new ServiceLocator();
      locator.registerInstance('serviceLocator', locator);
      locator.registerInstance('events', new events.EventEmitter());
      locator.register('collectionsFinder', CollectionsFinder, true);
      locator.register('collectionsLoader', CollectionsLoader, true);
      locator.register('watcher', Watcher, true);
    });

    it('should start watch', done => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';

      locator.registerInstance('config', {
        collectionsGlob: [
          `${caseRoot}/**/test-collection.json`
        ]
      });

      const events = locator.resolve('events');

      events.on('error', done);
      events.on('readyWatchers', watchers => {
        watchers.forEach(watcher => watcher.close());
        done();
      });

      locator.resolve('watcher');
      const loader = locator.resolve('collectionsLoader');

      loader.load();
    });

    it('should add new collection and load', () => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const tmpPath = path.normalize(path.join(caseRoot, '../tmp'));
      const anotherCollection = 'test/cases/lib/finders/CollectionsFinder/collections/test1/test2';
      const fullPathNew = path.join(tmpPath, 'newCollection');

      locator.registerInstance('config', {
        collectionsGlob: `${tmpPath}/**/test-collection.json`
      });

      const loader = locator.resolve('collectionsLoader');
      const watcher = locator.resolve('watcher');
      const events = locator.resolve('events');
      let collections;
      const onCollectionsLoaded = new Promise(fulfill => events.on('allCollectionsLoaded', fulfill));

      return promisify(fs.copy)(caseRoot, tmpPath)
        .then(() => loader.load())
        .then(() => onCollectionsLoaded)
        .then(loaded => {
          assert.equal(Object.keys(loaded).length, 1);

          const promise = new Promise((fulfill, reject) => {
            events.on('collectionLoaded', collection => {
              if (collection.name !== 'cool') {
                return;
              }

              try {
                assert.equal(Object.keys(loader.getCollectionsByNames()).length, 2);
                fulfill();
              } catch (e) {
                reject(e);
              }
            });
          });

          return Promise.all([promisify(fs.copy)(anotherCollection, fullPathNew), promise]);
        })
        .then(() => fs.removeSync(tmpPath))
        .catch(reason => {
          fs.removeSync(tmpPath);
          throw reason;
        });
    });

    it('should reload collection on change', () => {
      const caseRoot = 'test/cases/lib/finders/CollectionsFinder/watch';
      const tmpPath = path.normalize(path.join(caseRoot, '../tmp'));
      const alreadyPath = path.join(tmpPath, 'already', 'index.js');

      locator.registerInstance('config', {
        collectionsGlob: `${tmpPath}/**/test-collection.json`
      });

      const loader = locator.resolve('collectionsLoader');
      const watcher = locator.resolve('watcher');
      const events = locator.resolve('events');

      const onWatchReady = new Promise(fulfill => events.on('readyWatchers', fulfill));

      return promisify(fs.copy)(caseRoot, tmpPath)
        .then(() => loader.load())
        .then(() => onWatchReady)
        .then(() => {
          const promise = new Promise((fulfill, reject) => {
            events.on('collectionLoaded', collection => {
              if (collection.name !== 'already') {
                return;
              }

              try {
                const instance = new collection.constructor();
                assert.equal(instance.foo(), 'foo');

                fulfill();
              } catch (e) {
                reject(e);
              }
            });
          });

          let collectionJsonContent = fs.readFileSync(alreadyPath).toString();

          collectionJsonContent = collectionJsonContent.replace(/blablabla/, 'foo');

          fs.writeFileSync(alreadyPath, collectionJsonContent);

          return promise;
        })
        .then(() => fs.removeSync(tmpPath))
        .catch(reason => {
          fs.removeSync(tmpPath);
          throw reason;
        });
    });
  });
});

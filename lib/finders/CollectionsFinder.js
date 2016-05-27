'use strict';

const path = require('path');
const glob = require('glob');
const chokidar = require('chokidar');
const requireHelper = require('./../helpers/requireHelper');
const EventEmitter = require('events').EventEmitter;

const CHOKIDAR_OPTIONS = {
  ignoreInitial: true,
  cwd: process.cwd(),
  ignorePermissionErrors: true
};

const DEFAULT_COLLECTIONS_GLOB = [
  'collections/**/collection.json',
  'node_modules/*/collection.json'
];

const DEFAULT_LOGIC_FILENAME = 'index.js';
const COLLECTION_NAME_REGEXP = /^[\w-]+$/i;

/**
 * Class for find collections
 */
class CollectionsFinder extends EventEmitter {

  /**
   * Create instance
   *
   * @param {ServiceLocator} locator
   */
  constructor(locator) {
    super();

    /**
     * Found collections by name
     *
     * @type {Map}
     * @private
     */
    this._foundCollections = null;

    /**
     * Current Map of last found collections by their directories.
     * @type {Map}
     * @private
     */
    this._foundCollectionsByDirs = null;

    /**
     * Collections glob
     *
     * @type {string[]}
     * @private
     */
    this._collectionsGlob = DEFAULT_COLLECTIONS_GLOB;

    const collectionsGlob = locator.resolve('config').collectionsGlob;
    if (typeof (collectionsGlob) === 'string') {
      this._collectionsGlob = [collectionsGlob];
    } else if (Array.isArray(collectionsGlob)) {
      const strings = collectionsGlob.every(expression => typeof (expression) === 'string');

      if (strings) {
        this._collectionsGlob = collectionsGlob;
      }
    }

    this._events = locator.resolve('events');
  }

  /**
   * Watches the collections for changing.
   */
  watch() {
    /* istanbul ignore next */
    if (this._collectionsWatcher) {
      return;
    }

    /* istanbul ignore next */
    this._collectionsWatcher = chokidar.watch(Object.keys(this._foundCollectionsByDirs), CHOKIDAR_OPTIONS)
      .on('error', error => this._events.emit('error', error))
      .on('change', filename => {
        const collection = this._recognizeCollection(filename);
        if (!collection || collection.path === filename) {
          return;
        }

        const changeArgs = {
          filename,
          collection
        };

        // logic file is changed
        const relativeLogic = this.getRelativeForCollection(collection.path, collection.properties.logic);
        if (filename === relativeLogic) {
          this.emit('changeLogic', collection);
          this.emit('change', changeArgs);
          return;
        }

        this.emit('change', changeArgs);
      })
      .on('unlink', filename => {
        const collection = this._recognizeCollection(filename);
        if (!collection || collection.path === filename) {
          return;
        }
        this.emit('change', {filename, collection});
      })
      .on('add', filename => {
        const collection = this._recognizeCollection(filename);
        if (!collection || collection.path === filename) {
          return;
        }

        this.emit('change', {filename, collection});
      });

    // watch collection.json files
    /* istanbul ignore next */
    this._collectionJsonWatcher = chokidar.watch(this._collectionsGlob, CHOKIDAR_OPTIONS)
      .on('error', error => this._events.emit('error', error))
      // add new collection
      .on('add', filename => {
        const newCollection = this._createDescriptor(filename);
        this._addCollection(newCollection);
        this.emit('add', newCollection);
      })
      // change collection.json of the found collection
      .on('change', filename => {
        const collection = this._recognizeCollection(filename);
        if (!collection) {
          return;
        }
        const newCollection = this._createDescriptor(collection.path);

        // because collection name could be changed
        this._removeCollection(collection);
        this.emit('unlink', collection);

        this._addCollection(newCollection);
        this.emit('add', newCollection);
      })
      // unlink found collection
      .on('unlink', filename => {
        const collection = this._recognizeCollection(filename);
        if (!collection) {
          return;
        }
        this._removeCollection(collection);
        this.emit('unlink', collection);
      });
  }

  /**
   * Return chokidar watchers
   * @returns {{collections: (EventEmitter|*), collectionJson: (EventEmitter|*)}}
   */
  getWatchers() {
    return {
      collections: this._collectionsWatcher,
      collectionJson: this._collectionJsonWatcher
    };
  }

  /**
   * Gets a collection's inner path which is relative to CWD.
   * @param {string} collectionPath The path to the collection.
   * @param {string} innerPath The path inside the collection.
   * @returns {string} The path which is relative to CWD.
   */
  getRelativeForCollection(collectionPath, innerPath) {
    return path.relative(
      process.cwd(), path.normalize(
        path.join(path.dirname(collectionPath), innerPath)
      )
    );
  }

  /**
   * Get full path to file in collection
   *
   * @param {string} filePath Relative path to file in collection.
   * @returns {string}
   */
  getFullPathForFile(filePath) {
    return path.normalize(path.join(process.cwd(), filePath));
  }

  /**
   * Recognizes a collection by a path to its internal file.
   * @param {string} filename The filename of the internal file of the collection.
   * @returns {{name: string, path: string, properties: Object}|null} The found
   * collection's descriptor.
   * @private
   */
  _recognizeCollection(filename) {
    var current = filename;
    var collection = null;

    while (current !== '.') {
      if (current in this._foundCollectionsByDirs) {
        collection = this._foundCollectionsByDirs[current];
        break;
      }
      current = path.dirname(current);
    }
    return collection;
  }

  /**
   * Removes a found collection.
   * @param {{name: string, path: string, properties: Object}?} collection The found
   * collection's descriptor to remove.
   * @private
   */
  _removeCollection(collection) {
    const dirName = path.dirname(collection.path);
    const absolutePath = requireHelper.getAbsoluteRequirePath(collection.path);

    requireHelper.clearCacheKey(absolutePath);

    delete this._foundCollections[collection.name];
    delete this._foundCollectionsByDirs[dirName];

    if (this._collectionsWatcher) {
      this._collectionsWatcher.unwatch(dirName);
    }
  }

  /**
   * Finds all the collections.
   *
   * @returns {Promise}
   */
  find() {
    if (this._foundCollections) {
      return Promise.resolve(this._foundCollections);
    }

    this._foundCollections = Object.create(null);
    this._foundCollectionsByDirs = Object.create(null);

    const promises = this._collectionsGlob.map(expression =>
      new Promise((fulfill, reject) => {
        const collectionFilesGlob = new glob.Glob(expression, {
          nosort: true,
          silent: true,
          nodir: true
        });

        collectionFilesGlob
          .on('match', match => {
            const collectionDescriptor = this._createDescriptor(match);

            this._addCollection(collectionDescriptor);
            this._events.emit('collectionFound', collectionDescriptor);
          })
          .on('error', reject)
          .on('end', fulfill);
      }));

    return Promise.all(promises).then(() => this._foundCollections);
  }

  /**
   * Creates a descriptor for a found collection
   *
   * descriptor = {
   *   constructor: Class,
   *   name: ''
   *   properties: {
   *      logic: '',
   *      endpoints: {}
   *   }
   *   path: ''
   * }
   *
   * @param {String} filename File name of collection
   * @returns {*} Descriptor for collection
   * @private
   */
  _createDescriptor(filename) {
    if (!filename) {
      return null;
    }

    const absolutePath = `${process.cwd()}/${filename}`;

    let properties;
    try {
      properties = require(absolutePath);
    } catch (e) {
      this._events.emit('error', e);
    }

    if (!properties) {
      return null;
    }

    const collection_name = (properties.name || path.basename(path.dirname(filename))).toLowerCase();

    if (!COLLECTION_NAME_REGEXP.test(collection_name)) {
      this._events.emit('warn',
        `Collection name "${collection_name}" is incorrect (${COLLECTION_NAME_REGEXP.toString()}), skipping...`
      );
      return null;
    }

    if (typeof (properties.logic) !== 'string') {
      properties.logic = DEFAULT_LOGIC_FILENAME;
    }

    return {
      name: collection_name,
      properties,
      path: path.relative(process.cwd(), filename)
    };
  }

  /**
   * Adds a found collection.
   *
   * @param {Object} collection Collection's descriptor
   * @private
   */
  _addCollection(collection) {
    if (!collection) {
      return;
    }

    if (collection.name in this._foundCollections) {
      const existed_collection = this._foundCollections[collection.name];
      this._events.emit('warn',
        `Collection ${collection.path} has the same name as ${existed_collection.path} (${collection.name}), skipping...`
      );
      return;
    }

    this._foundCollections[collection.name] = collection;

    const dirName = path.dirname(collection.path);
    this._foundCollectionsByDirs[dirName] = collection;
  }
}

module.exports = CollectionsFinder;

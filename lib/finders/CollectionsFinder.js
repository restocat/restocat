'use strict';

const path = require('path');
const glob = require('glob');
const requireHelper = require('./../helpers/requireHelper');

const DEFAULT_COLLECTIONS_GLOB = [
  'collections/**/collection.json',
  'node_modules/*/collection.json'
];
const DEFAULT_LOGIC_FILENAME = 'index.js';
const COLLECTION_NAME_REGEXP = /^[\w-]+$/i;

/**
 * Class for find collections
 */
class CollectionsFinder {

  /**
   * Create instance
   *
   * @param {ServiceLocator} locator The Service Locator for resolving dependencies
   */
  constructor(locator) {

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
   * @returns {string} Normalize path
   */
  getFullPathForFile(filePath) {
    return path.normalize(path.join(process.cwd(), filePath));
  }

  /**
   * Recognizes a collection by a path to its internal file.
   *
   * @param {string} filename The filename of the internal file of the collection.
   * @returns {{name: string, path: string, properties: Object}|null} The found collection's descriptor.
   * @private
   */
  recognizesCollection(filename) {
    let current = filename;
    let collection = null;

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
   *
   * @param {{name: string, path: string, properties: Object}?} collection The found collection's descriptor to remove.
   * @return {void}
   * @private
   */
  removeCollection(collection) {
    const dirName = path.dirname(collection.path);
    const absolutePath = requireHelper.getAbsoluteRequirePath(collection.path);

    requireHelper.clearCacheKey(absolutePath);

    delete this._foundCollections[collection.name];
    delete this._foundCollectionsByDirs[dirName];
  }

  /**
   * Add new collection
   *
   * @param {String} filename Filename of new collection
   * @return {Object|Null} Collection's descriptor
   */
  newCollection(filename) {
    const newCollection = this._createDescriptor(filename);

    if (!newCollection) {
      return null;
    }

    return this._addCollection(newCollection);
  }

  /**
   * Array of glob
   *
   * @returns {Array} Globs
   */
  getCollectionsGlob() {
    return this._collectionsGlob;
  }

  /**
   * Get map of found collection by dirs
   *
   * @returns {Map} Found collections
   */
  getDirsOfFoundCollections() {
    return Object.keys(this._foundCollectionsByDirs);
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

            if (!collectionDescriptor) {
              return;
            }

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
      return null;
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

    const pathCollectionJson = path.normalize(path.relative(process.cwd(), filename));
    const directory = path.dirname(pathCollectionJson);
    const logicFile = path.join(directory, properties.logic);

    return {
      name: collection_name,
      path: pathCollectionJson,
      properties,
      directory,
      logicFile
    };
  }

  /**
   * Adds a found collection.
   *
   * @param {Object} collection Collection's descriptor
   * @return {Object|Null} Collection's descriptor
   * @private
   */
  _addCollection(collection) {
    if (!collection) {
      return null;
    }

    if (collection.name in this._foundCollections) {
      const existed_collection = this._foundCollections[collection.name];
      this._events.emit('warn',
        `Collection ${collection.path} has the same name as ${existed_collection.path} (${collection.name}), skipping...`
      );
      return null;
    }

    this._foundCollections[collection.name] = collection;

    const dirName = path.dirname(collection.path);
    this._foundCollectionsByDirs[dirName] = collection;

    return collection;
  }
}

module.exports = CollectionsFinder;

'use strict';

const path = require('path');
const requireHelper = require('./helpers/requireHelper');

/**
 * Implements the collections Loader class.
 */
class CollectionsLoader {

  /**
   * Creates new instance
   *
   * @param {ServiceLocator} locator
   */
  constructor(locator) {

    /**
     * Current event bus.
     *
     * @type {EventEmitter}
     * @private
     */
    this._events = locator.resolve('events');

    /**
     * Current collections finder.
     *
     * @type {CollectionsFinder}
     * @private
     */
    this._collectionsFinder = locator.resolve('collectionsFinder');

    /**
     * Current map of the loaded collections by their names.
     *
     * @type {Object}
     * @private
     */
    this._loadedCollections = null;
  }

  /**
   * Loads all collections into the memory.
   *
   * @returns {Promise<Object>} The promise for map of loaded collections.
   */
  load() {
    if (this._loadedCollections) {
      return Promise.resolve(this._loadedCollections);
    }

    const result = Object.create(null);

    return this._collectionsFinder.find()
      .then(collections =>
        Object
          .keys(collections)
          .map(collection_name =>
            this._getCollection(collections[collection_name])
          )
      )
      .then(collection_list => {
        collection_list.forEach(collection => {
          if (!collection || typeof (collection) !== 'object') {
            return;
          }

          result[collection.name] = collection;
        });

        if (!this._isRelease) {
          this._events.emit('info', 'Watching collections for changes...');
          this._collectionsFinder.watch();
          this._handleChanges();
        }

        this._loadedCollections = result;
        this._events.emit('collectionsLoaded', result);

        return this._loadedCollections;
      });
  }

  /**
   * Reload collection
   *
   * @param descriptor
   * @private
   */
  _loadCollection(descriptor) {
    this._loadedCollections[descriptor.name] = this._getCollection(descriptor);
  }

  /**
   * Handles changes while watching.
   * @private
   */
  _handleChanges() {
    this._collectionsFinder
      .on('add', descriptor => {
        this._events.emit('info', `Collection "${descriptor.path}" has been added, initializing...`);
        requireHelper.clearCacheKey(this._getLogicPath(descriptor));
        this._loadCollection(descriptor);
      })
      .on('change', args => {
        this._events.emit('info', `Scripts of the "${args.collection.name}" collection have been changed, reinitializing...`);

        const logicFile = this._getLogicPath(args.collection);
        const anotherFile = this._collectionsFinder.getFullPathForFile(args.filename);

        if (logicFile !== anotherFile) {
          requireHelper.clearCacheKey(anotherFile);
        }

        requireHelper.clearCacheKey(logicFile);

        this._loadCollection(args.collection);
      })
      .on('unlink', descriptor => {
        this._events.emit('info', `Collection "${descriptor.path}" has been unlinked, removing...`);
        requireHelper.clearCacheKey(this._getLogicPath(descriptor));
        delete this._loadedCollections[descriptor.name];
      });
  }

  /**
   * Gets a collection object by the found collection details.
   *
   * @param {Object} descriptor The found details.
   * @returns {Object} The collection object.
   * @private
   */
  _getCollection(descriptor) {
    const logic_path = this._getLogicPath(descriptor);

    let constructor;
    try {
      constructor = require(logic_path);
    } catch (e) {
      this._events.emit('error', e);
      return null;
    }

    if (typeof (constructor) !== 'function') {
      this._events.emit('warn',
        `File at ${logic_path} of collection "${descriptor.name}" not found or does not export the constructor. Skipping...`
      );
      return null;
    }

    const collection = Object.create(descriptor);
    collection.constructor = constructor;

    this._events.emit('collectionLoaded', collection);

    return collection;
  }

  /**
   * Return descriptor of collection by name
   *
   * @param name
   */
  getCollectionByName(name) {
    return this._loadedCollections[name];
  }

  /**
   * Gets an absolute path to the collection's logic file.
   * @param {Object} collectionDetails The collection details object.
   * @returns {string} The absolute path to the logic file.
   * @private
   */
  _getLogicPath(collectionDetails) {
    return path.resolve(path.dirname(collectionDetails.path), collectionDetails.properties.logic);
  }
}

module.exports = CollectionsLoader;

'use strict';

const path = require('path');
const requireHelper = require('./../helpers/requireHelper');

/**
 * Implements the collections Loader class.
 */
class CollectionsLoader {

  /**
   * Creates new instance
   *
   * @param {ServiceLocator} locator The Service Locator for resolving dependencies.
   */
  constructor(locator) {
    this._locator = locator;

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
          .map(collection_name => this._getCollection(collections[collection_name]))
      )
      .then(collection_list => {
        collection_list.forEach(collection => {
          if (!collection || typeof (collection) !== 'object') {
            return;
          }

          this._events.emit('collectionLoaded', collection);
          result[collection.name] = collection;
        });

        this._loadedCollections = result;
        this._events.emit('allCollectionsLoaded', result);

        return this._loadedCollections;
      });
  }

  /**
   * Load/Reload collection
   *
   * @param {Object} descriptor Collection's descriptor
   * @return {void}
   * @private
   */
  loadCollection(descriptor) {
    const collection = this._getCollection(descriptor);

    if (collection) {

      this._loadedCollections[descriptor.name] = collection;
      this._events.emit('collectionLoaded', collection);

    } else if (this._loadedCollections[descriptor.name]) {

      // remove, if it was previously loaded
      this.removeCollection(descriptor.name);
    }
  }

  /**
   * Remove collection by name
   *
   * @param {String} name Collection's name
   * @return {void}
   */
  removeCollection(name) {
    delete this._loadedCollections[name];
  }

  /**
   * Gets a collection object by the found collection details.
   *
   * collection = {
   *   constructor: Class,
   *   name: ''
   *   properties: {
   *      logic: '',
   *      endpoints: {}
   *   }
   *   path: ''
   * }
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
      if (e.code === 'ENOENT' || e.message.indexOf('Cannot find module') !== -1) {
        this._events.emit('error', `In collection ${descriptor.name} the logic file has been moved or deleted. Skipping...`);
      } else {
        this._events.emit('error', `In collection ${descriptor.name} error. Skipping... \n ${e.stack}`);
      }
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
   * Return collections by name
   */
  getCollectionsByNames() {
    return this._loadedCollections;
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

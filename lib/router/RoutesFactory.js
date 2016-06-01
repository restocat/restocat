'use strict';

const Route = require('./Route');

const DEFAULT_ENDPOINTS = {
  'get /': 'list',
  'get /:id': 'one',
  'post /': 'create',
  'delete /:id': 'delete',
  'put /:id': 'update'
};

class RoutesFactory {

  /**
   * Create new instance of RoutesFactory
   *
   * @param {ServiceLocator} locator Current service locator
   */
  constructor(locator) {
    this._locator = locator;
    this._collectionsLoader = locator.resolve('collectionsLoader');
    this._definedRoutes = locator.resolve('definedRoutes');
  }

  /**
   * Create routes based on the description of the collection
   *
   * @returns {Promise} Promise will be resolved with routes
   */
  create() {
    return this._collectionsLoader.load()
      .then(collections => {
        return Object.keys(this._definedRoutes)
          .map(collectionName => {
            if (!collections[collectionName]) {
              return null;
            }

            return this.createRoutesForCollection(collections[collectionName]);
          })
          .filter(Boolean)
          .reduce((routes, endpoints) => {
            return routes.concat(endpoints);
          }, []);
      });
  }

  /**
   * Create routes for passed collection
   *
   * @param {Object} descriptionCollection Description of collection
   * @returns {Array} Array of routes endpoint in collection
   */
  createRoutesForCollection(descriptionCollection) {
    const endpoints = Object.create(null);

    if (descriptionCollection.properties.endpointsDefault !== false) {
      this.assign(endpoints, DEFAULT_ENDPOINTS);
    }

    if (descriptionCollection.properties.endpoints) {
      this.assign(endpoints, descriptionCollection.properties.endpoints);
    }

    return Object.keys(endpoints)
      .map(endpointPath => this.createRoute(endpoints, endpointPath, descriptionCollection));
  }

  /**
   * Create route for current endpoint
   *
   * @param {Array} endpoints Array of route path
   * @param {String} endpointPath Current route path for handle
   * @param {Object} descriptionCollection Description of collection
   * @returns {Route} Route for one handle of collection
   */
  createRoute(endpoints, endpointPath, descriptionCollection) {
    const handleName = endpoints[endpointPath];

    return new Route(this._locator, descriptionCollection, handleName, endpointPath);
  }

  /**
   * Assign endpoint from source to destination
   *
   * @param {Object} destination Destination obj
   * @param {Object} source Source obj
   */
  assign(destination, source) {
    Object.keys(source).forEach(key => {
      if (source[key] === false) {
        delete destination[key];
      } else {
        destination[key] = source[key];
      }
    });
  }
}

module.exports = RoutesFactory;

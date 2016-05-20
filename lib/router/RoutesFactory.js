'use strict';

const Route = require('./Route');
const CustomError = require('./../CustomError');
const path = require('path');
const definedRoutes = require(path.join(process.cwd(), 'routes'));

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
   * @param locator
   */
  constructor(locator) {
    this._locator = locator;
    this._collectionsLoader = locator.resolve('collectionsLoader');
  }

  /**
   * Create routes based on the description of the collection
   *
   * @returns {Promise}
   */
  create() {
    return this._collectionsLoader.load()
      .then(collections => {
        return Object.keys(definedRoutes)
          .map(collectionName => {
            collectionName = collectionName.toLowerCase();

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
   * @param descriptionCollection
   * @returns {Array}
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
   * @param endpoints
   * @param endpointPath
   * @param descriptionCollection
   * @returns {Route}
   */
  createRoute(endpoints, endpointPath, descriptionCollection) {
    const handleName = endpoints[endpointPath];

    return new Route(this._locator, descriptionCollection, handleName, endpointPath);
  }

  /**
   * Assign endpoint from source to destination
   * @param destination
   * @param source
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

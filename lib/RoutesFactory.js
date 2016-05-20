'use strict';

const pathToRegexp = require('path-to-regexp');
const path = require('path');
const definedRoutes = require(path.join(process.cwd(), 'routes'));
const CustomError = require('./CustomError');

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
    this._events = locator.resolve('events');

    this._collectionsLoader = locator.resolve('collectionsLoader');
    this._contextFactory = locator.resolve('contextFactory');
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
   * @returns {Object}
   */
  createRoute(endpoints, endpointPath, descriptionCollection) {
    const route = Object.create(null);
    const part = endpointPath.split(' ');

    route.handleName = endpoints[endpointPath];
    route.method = part[0].toLowerCase();
    route.path = path.join(definedRoutes[descriptionCollection.name], part[1]);

    if (route.path[route.path.length - 1] === '/' && route.path.length !== 1) {
      route.path = route.path.slice(0, -1);
    }

    route.pathValues = [];
    route.regexp = pathToRegexp(route.path, route.pathValues);

    if (route.path === '/') {
      route.regexp.fast_slash = true;
    }

    route.handle = this.createHandle(route.handleName, descriptionCollection.name);

    return route;
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

  /**
   * Middleware for router
   *
   * @param handleName
   * @param collectionName
   */
  /* eslint max-params: 0 */
  createHandle(handleName, collectionName) {
    return (request, response, state) => {
      const descriptor = this._collectionsLoader.getCollectionByName(collectionName);
      const additionalContext = {
        name: descriptor.name,
        handleName,
        state
      };
      const context = this._contextFactory.create(request, response, additionalContext);
      const constructor = descriptor.constructor;

      constructor.prototype.$context = context;

      const instance = new constructor(context.locator);

      if (!instance[handleName]) {
        const error = `Not found handler '${handleName}' in collection's logic file '${collectionName}'`;
        this._events.emit('error', error);

        return next(new CustomError.InternalServerError(error));
      }

      instance[handleName].$context = context;

      return Promise.resolve(instance[handleName]())
        .then(result => {
          return {result, context};
        });
    };
  }
}

module.exports = RoutesFactory;

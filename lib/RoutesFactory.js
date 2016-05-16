'use strict';

const Router = require('router');
const responseHelpers = require('./helpers/response');
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

            return this.createCollectionRouter(collections[collectionName]);
          })
          .filter(Boolean);
      });
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
   *
   * @param descriptor
   * @returns {Router}
   */
  createCollectionRouter(descriptor) {
    const endpoints = Object.create(null);
    const router = new Router();

    if (descriptor.properties.endpointsDefault !== false) {
      this.assign(endpoints, DEFAULT_ENDPOINTS);
    }

    if (descriptor.properties.endpoints) {
      this.assign(endpoints, descriptor.properties.endpoints);
    }

    Object.keys(endpoints).forEach(endpoint => {
      const part = endpoint.split(' ');
      const method = part[0].toLowerCase();
      const handleName = endpoints[endpoint];
      let route = path.join(definedRoutes[descriptor.name], part[1]);

      if (route[route.length - 1] === '/') {
        route = route.slice(0, -1);
      }

      router[method](route, this.handler.bind(this, handleName, descriptor.name));
    });

    return router;
  }

  /**
   * Middleware for router
   *
   * @param handleName
   * @param collectionName
   * @param request
   * @param response
   * @param next
   */
  /* eslint max-params: 0 */
  handler(handleName, collectionName, request, response, next) {
    const descriptor = this._collectionsLoader.getCollectionByName(collectionName);
    const context = this.createContext(request, response, handleName, descriptor);
    const constructor = descriptor.constructor;

    constructor.prototype.$context = context;

    const instance = new constructor(context.locator);

    if (!instance[handleName]) {
      const error = `Not found handler '${handleName}' in collection's logic file '${collectionName}'`;
      this._events.emit('error', error);

      return next(new CustomError.InternalServerError(error));
    }

    instance[handleName].$context = context;

    Promise.resolve(instance[handleName]())
      .then(data => responseHelpers.send(data, context.response))
      .catch(next);
  }

  /**
   * Create context for collection instance
   *
   * @param request
   * @param response
   * @param handleName
   * @param descriptor
   * @returns {Object}
   */
  createContext(request, response, handleName, descriptor) {
    const context = Object.create(null);

    context.locator = this._locator;

    context.name = descriptor.name;
    context.handleName = handleName;

    context.request = request;
    context.response = response;

    context.forward = () => console.log('Here will forwarding request to another collection');
    context.notFound = () => console.log('Not found call');

    Object.freeze(context);

    return Object.create(context);
  }
}

module.exports = RoutesFactory;

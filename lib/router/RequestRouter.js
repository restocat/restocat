'use strict';

const errors = require('../errors');
const helperPromises = require('../helpers/promises');
const Promise = require('bluebird');

class RequestRouter {

  constructor(locator) {
    this._routesFactory = locator.resolve('routesFactory');
    this._contextFactory = locator.resolve('contextFactory');
    this._events = locator.resolve('events');
    this._locator = locator;

    this._routesByMethod = null;
    this._routesByCollectionName = null;

    this._formatterProvider = this._locator.resolve('formatterProvider');
  }

  /**
   * Serial call of middlewares
   *
   * @param {Context} $context Current context
   * @return {Promise} Promise that will resolve when all middleware called
   */
  callMiddlewares($context) {
    const type = 'middleware';

    if (!this._locator.has(type)) {
      return Promise.resolve();
    }

    const middlewares = this._locator.resolveAll(type);

    const promises = middlewares.map(middleware => (() => middleware($context)));

    return helperPromises.serial(promises);
  }

  /**
   * Incoming message handler
   *
   * @param {IncomingMessage} request Request
   * @param {ServerResponse} response Response
   * @returns {void}
   */
  requestListener(request, response) {
    request.time = response.time = Date.now();

    this._events.emit('incomingMessage', request);

    response.once('finish', () => this._events.emit('responseServer', response, request));

    const location = request.getLocation();
    const match = this.findRoute(request.method, location.path);

    if (!match) {
      return this.notImplementedHandle(request)
        .catch(reason => this.format(reason, this._contextFactory.create(request, response)))
        .then(content => response.send(content));
    }

    const route = match.route;
    const state = match.state;

    const $context = this._contextFactory.create(request, response, {
      name: route.collectionName,
      properties: route.descriptor.properties,
      handleName: route.handleName,
      state
    });

    this.callMiddlewares($context)
      .then(() => route.handle($context))
      .then(content => this.handleResultProcess(content, $context))
      .then(content => {
        // for HEAD content should be empty and if not should send
        if (request.method === 'HEAD' || $context.actions.notSend) {
          return Promise.resolve(content);
        }

        return Promise.resolve().then(() => this.format(content, $context));
      })
      .then(content => {
        if ($context.actions.notSend) {
          return null;
        }

        if ($context.actions.redirect) {
          response.redirect($context.actions.redirect.uri, $context.actions.redirect.statusCode);

          this._events.emit('redirect', $context.actions.redirect);

          return null;
        }

        return response.send(content);
      })
      .catch(reason => this.errorHandler(request, response, reason));
  }

  /**
   * find formatter and format response content
   *
   * @param {*} content Content from handle
   * @param {Context} context Current context
   * @return {*} Format content
   */
  format(content, context) {
    const formatter = this._formatterProvider.getFormatter(context);

    if (!formatter) {
      throw new errors.InternalServerError('Not found formatter');
    }

    return formatter(context, content);
  }

  /**
   * Forwarding request to another collection
   *
   * @param {Object} forward Description of forwarding
   * @param {Context} $context Current context
   * @returns {Promise} Promise that will resolve when new route handle and handle result called
   */
  forwarding(forward, $context) {
    const routes = this._routesByCollectionName[forward.collectionName];

    if (!routes) {
      const message = `Collection ${forward.collectionName} not found for forward`;
      return Promise.reject(new errors.InternalServerError(message, 'forwardCollectionNotFound'));
    }

    const route = routes[forward.handleName];

    if (!route) {
      const message = `Handle ${forward.handleName} not found for forward`;
      return Promise.reject(new errors.InternalServerError(message, 'forwardCollectionNotFound'));
    }

    this._events.emit('forwarding', `Forwarding to ${forward.collectionName}.${forward.handleName} ...`);

    return Promise.resolve()
      .then(route.handle($context))
      .then(content => this.handleResultProcess(content, $context));
  }

  /**
   * Processing result
   *
   * @param {Object} content Result from route.handle
   * @param {Context} $context Current context
   * @returns {Promise} Promise
   */
  handleResultProcess(content, $context) {
    if ($context.actions.notFound) {
      throw new errors.NotFoundError(
        $context.actions.notFound.message,
        $context.actions.notFound.code
      );
    }

    if ($context.actions.forward) {
      const forward = $context.actions.forward;

      $context.actions.forward = null;

      return this.forwarding(forward, $context);
    }

    return Promise.resolve(content);
  }

  /**
   * Find route matched with current path
   *
   * @param {String} method HTTP method
   * @param {String} path Current URI
   * @returns {Object} Route and current state
   */
  findRoute(method, path) {
    const routes = this._routesByMethod[method.toLowerCase()] || [];
    let index = 0;
    let state = null;
    let route = null;

    while (!state && index < routes.length) {
      route = routes[index++];
      state = route.match(path);
    }

    if (!state) {
      return false;
    }

    return {
      route,
      state
    };
  }

  /**
   * Stub for not found handle
   *
   * @param {IncomingMessage} request Current request
   * @returns {Promise} Rejected promise
   */
  notImplementedHandle(request) {
    return Promise.reject(
      new errors.NotImplementedError(`Resource or collection '${request.url}' not implemented in API`)
    );
  }

  /**
   * Error handler for Router
   *
   * @param {IncomingMessage} request Current request
   * @param {ServerResponse} response Current response
   * @param {HttpError|*} error Error
   * @returns {void}
   */
  errorHandler(request, response, error) {
    const $context = this._contextFactory.create(request, response);

    if (!error) {
      error = new errors.InternalServerError('Call error handler without error');
    }

    if (!(error instanceof Error)) {
      error = new Error(error);
    }

    Promise.resolve()
      .then(() => this._events.emit('error', error))
      .then(() => this.format(error, $context))
      .then(content => {
        response.setStatus(Number(error.status));
        response.send(content);
      })
      .catch(error => {
        const content = `Internal Server Error: During the preparation of the
          response error in the formatter threw an exception. \n ${error}`;

        this._events.emit('error', new Error(content));

        response.setHeader('Content-Type', 'text/plain');
        response.setHeader('Content-Length', content.length);
        response.setStatus(500);

        response.send(content);
      });
  }

  /**
   * Initialization routes
   *
   * @returns {Promise} Promise resolved when get routes
   */
  init() {
    return this._routesFactory
      .create()
      .then(routes => {

        this._routesByMethod = Object.create(null);
        this._routesByCollectionName = Object.create(null);

        routes.forEach(route => {
          const method = route.method;
          const collectionName = route.collectionName;
          const handleName = route.handleName;

          this._routesByMethod[method] = this._routesByMethod[method] || [];
          this._routesByMethod[method].push(route);

          this._routesByCollectionName[collectionName] =
            this._routesByCollectionName[collectionName] || Object.create(null);
          this._routesByCollectionName[collectionName][handleName] = route;
        });
      });
  }
}

module.exports = RequestRouter;

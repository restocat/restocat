'use strict';

const errors = require('../errors');
const helperPromises = require('../helpers/promises');

class RequestRouter {

  constructor(locator) {
    this._routesFactory = locator.resolve('routesFactory');
    this._events = locator.resolve('events');
    this._locator = locator;

    this._routesByMethod = null;
    this._routesByCollectionName = null;

    this._formatterProvider = this._locator.resolve('formatterProvider');
  }

  /**
   * Serial call of middlewares
   *
   * @param {IncomingMessage} request Request
   * @param {ServerResponse} response Response
   * @param {Object} state State
   * @return {Promise} Promise that will resolve when all middleware called
   */
  callMiddlewares(request, response, state) {
    let middlewares;

    try {
      middlewares = this._locator.resolveAll('middleware');
    } catch (e) {
      // Middlewares not found
      return Promise.resolve();
    }

    const promises = middlewares.map(middleware => (() => middleware(request, response, state)));

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

    response.on('finish', () => this._events.emit('responseServer', response, request));

    const data = this.getHandleAndState(request);
    const handle = data.handle;
    const state = data.state;

    Promise.resolve()
      .then(() => this.callMiddlewares(request, response, state))
      .then(() => handle(request, response, state))
      .then(data => this.handleResultProcess(data, request, response, state))
      .then(data => {
        // for HEAD content should be empty and if not should send
        if (request.method === 'HEAD' || data.context.actions.notSend) {
          return Promise.resolve(data);
        }

        return Promise.resolve(this.format(data))
          .then(result => {
            return {
              context: data.context,
              result
            };
          });
      })
      .then(data => {
        if (data.context.actions.notSend) {
          return null;
        }

        if (data.context.actions.redirect) {
          response.redirect(data.context.actions.redirect.uri, data.context.actions.redirect.statusCode);

          this._events.emit('redirect', data.context.actions.redirect);

          return null;
        }

        return response.send(data.result);
      })
      .catch(reason => this.errorHandle(request, response, reason));
  }

  /**
   * Find handle and get state
   *
   * @param {IncomingMessage} request Current request
   * @returns {{handle: *, state: (*|Array|{index: number, input: string})}}
   */
  getHandleAndState(request) {
    const location = request.getLocation();
    const match = this.findRoute(request.method, location.path);
    const state = match.state;
    let handle = null;

    if (!match) {
      handle = this.notImplementedHandle;
    } else {
      handle = match.route.handle;
    }

    return {handle, state};
  }

  /**
   * find formatter and format response content
   *
   * @param {Object} data Object
   * @param {Context} data.context Current context
   * @param {*} data.result Content from handle
   * @return {*} Format content
   */
  format(data) {
    const formatter = this._formatterProvider.getFormatter(data.context);

    if (!formatter) {
      throw new errors.InternalServerError('Not found formatter');
    }

    return formatter(data.context, data.result);
  }

  /**
   * Forwarding request to another collection
   *
   * @param {Object} forward Description of forwarding
   * @param {IncomingMessage} request Request
   * @param {ServerResponse} response Response
   * @param {Object} state Current state
   * @returns {Promise} Promise that will resolve when new route handle and handle result called
   */
  forwarding(forward, request, response, state) {
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

    return Promise
      .resolve(route.handle(request, response, state))
      .then(data => this.handleResultProcess(data, request, response, state));
  }

  /**
   * Processing result
   *
   * @param {Object} data Result from route.handle
   * @param {IncomingMessage} request Request
   * @param {ServerResponse} response Response
   * @param {Object} state Current state
   * @returns {Promise} Promise
   */
  handleResultProcess(data, request, response, state) {
    const context = data.context;

    if (context.actions.notFound) {
      throw new errors.NotFoundError(
        context.actions.notFound.message,
        context.actions.notFound.code
      );
    }

    if (context.actions.forward) {
      const forward = context.actions.forward;

      context.actions.forward = null;

      return this.forwarding(forward, request, response, state);
    }

    return data;
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
  errorHandle(request, response, error) {
    const context = {
      request,
      response
    };

    if (!error) {
      error = new errors.InternalServerError('Call error handler without error');
    }

    if (!(error instanceof errors.HttpError)) {
      const newError = new errors.InternalServerError(error.message);
      newError.stack = error.stack;

      error = newError;
    }

    this._events.emit('error', error.stack);

    Promise
      .resolve(this.format({context, result: error}))
      .then(content => {
        response.setStatus(Number(error.status));
        response.send(content);
      })
      .catch(error => {
        response.send(
          500,
          'Internal Server Error: During the preparation of the response error in the formatter threw an exception.'
        );
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

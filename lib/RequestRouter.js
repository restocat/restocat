'use strict';

const CustomError = require('./CustomError');
const URI = require('catberry-uri').URI;
const responseHelpers = require('./helpers/response');

class RequestRouter {

  constructor(locator) {
    this._routesFactory = locator.resolve('routesFactory');
    this._events = locator.resolve('events');

    this._routes = [];
    this._routesByMethod = {};
    this._middlewares = [];
  }

  /**
   * set middleware
   *
   * @param func
   */
  middleware(func) {
    this._middlewares.push(func);
  }

  callMiddlewares(request, response, state) {
    return this._middlewares.reduce((previous, middleware) => {
      return previous.then(middleware(request, response, state));
    }, Promise.resolve());
  }

  /**
   * Incoming message handler
   *
   * @param request
   * @param response
   */
  requestListener(request, response) {
    const location = new URI(request.url);

    this._events.emit('incomingMessage', request);

    const match = this.findRoute(request.method, location.path);
    const state = match.state;
    let handle = null;

    if (!match) {
      handle = this.notImplementedHandle;
    } else {
      handle = match.route.handle;
    }

    return Promise.resolve()
      .then(() => {
        if (this._middlewares.length) {
          return this.callMiddlewares(request, response, state);
        }

        return Promise.resolve();
      })
      .then(() => handle(request, response, match.state))
      .then(data => {
        const context = data.context;
        const result = data.result;

        if (context.actions.notFound) {
          const error = new CustomError.NotFoundError(
            context.actions.notFound.message,
            context.actions.notFound.code
          );

          return this.errorHandle(request, response, error);
        }

        if (context.actions.forward) {
          // TODO: IMPLEMENT!
        }

        return responseHelpers.send(result, response);
      })
      .catch(reason => this.errorHandle(request, response, reason));
  }

  /**
   * Find route matched with current path
   *
   * @param method HTTP method
   * @param path
   * @returns {Object} Route and current state
   */
  findRoute(method, path) {
    const routes = this._routesByMethod[method.toLowerCase()] || [];
    let index = 0;
    let state = null;
    let route = null;

    while (!state && index < routes.length) {
      route = routes[index++];
      state = this.matchRoute(path, route);
    }

    if (!route) {
      return false;
    }

    return {
      route,
      state
    };
  }

  /**
   * Match route
   * @param path
   * @param route
   * @returns {*}
   */
  matchRoute(path, route) {
    if (!path) {
      return false;
    }

    if (path === '/' && route.regexp.fast_slash) {
      return Object.create(null);
    }

    const results = route.regexp.exec(path);

    if (!results) {
      return false;
    }

    const params = Object.create(null);
    const keys = route.pathValues;

    for (let i = 1; i < results.length; i++) {
      const key = keys[i - 1];
      const prop = key.name;
      const value = decode_param(results[i]);

      if (value !== undefined || !(hasOwnProperty.call(params, prop))) {
        params[prop] = value;
      }
    }

    return params;
  }

  /**
   * Stub for not found handle
   * @param request
   * @returns {Promise}
   */
  notImplementedHandle(request) {
    return Promise.reject(
      new CustomError.NotImplementedError(`Resource or collection '${request.url}' not implemented in API`)
    );
  }

  /**
   * Final handler for Router
   *
   * @param req
   * @param res
   * @param error
   */
  errorHandle(req, res, error) {
    const env = 'development';

    if (!error) {
      return;
    }

    if (!(error instanceof CustomError)) {

      const newError = new CustomError.InternalServerError(error.message);
      newError.stack = error.stack;

      error = newError;
    }

    const prepared = Object.create(null);

    /* eslint guard-for-in: 0 */
    for (const prop in error) {
      prepared[prop] = error[prop];
    }

    if (env === 'production') {
      delete prepared.stack;
    } else if (env === 'development') {
      prepared.stack = error.stack;
    }

    this._events.emit('error', error.stack);

    res.statusCode = error.status;

    responseHelpers.send({error: prepared}, res);
  }

  /**
   * Initialization routes
   *
   * @returns {Promise}
   */
  init() {
    return this._routesFactory
      .create()
      .then(routes => {
        this._routes = routes;

        routes.forEach(route => {
          this._routesByMethod[route.method] = this._routesByMethod[route.method] || [];
          this._routesByMethod[route.method].push(route);
        });
      });
  }
}

/**
 * Decode param value.
 *
 * @param {string} value
 * @return {string}
 * @private
 */
function decode_param(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = `Failed to decode param '${value}'`;
      err.status = 400;
    }

    throw err;
  }
}

module.exports = RequestRouter;

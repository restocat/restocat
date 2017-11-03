const errors = require('../errors');
const helpers = require('../helpers');
const helperPromises = helpers.promises;
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
  async callMiddlewares($context) {
    const type = 'middleware';

    if (this._locator.has(type)) {
      const middlewares = this._locator.resolveAll(type);

      for (const middleware of middlewares) {
        await middleware($context); // eslint-disable-line no-unused-expressions
      }
    }
  }

  /**
   * Incoming message handler
   *
   * @param {IncomingMessage} request Request
   * @param {ServerResponse} response Response
   * @returns {Promise} Promise resolved
   */
  async requestListener(request, response) {
    request.time = response.time = Date.now();
    request.uuid = helpers.uuid();

    this._events.emit('incomingMessage', request);

    response.once('finish', () => this._events.emit('responseServer', response, request));

    const location = request.getLocation();
    const match = this.findRoute(request.method, location.path);

    if (!match) {
      const notImplementedContext = this._contextFactory.create(request, response);
      let content;

      try {
        content = await this.notImplementedHandle(notImplementedContext);
      } catch (error) {
        content = error;
      }

      content = await this.format(content, notImplementedContext);

      return response.send(content);
    }

    const route = match.route;
    const state = match.state;

    const $context = this._contextFactory.create(request, response, {
      name: route.collectionName,
      properties: route.descriptor.properties,
      handleName: route.handleName,
      state
    });

    try {
      await this.callMiddlewares($context); // eslint-disable-line

      let content = await route.handle($context);

      content = await this.handleResultProcess(content, $context);

      // for HEAD content should be empty and if not should send
      if (request.method === 'HEAD' || $context.actions.notSend) {
        return content;
      }

      content = await this.format(content, $context);

      if ($context.actions.notSend) {
        return null;
      }

      if ($context.actions.redirect) {
        response.redirect($context.actions.redirect.uri, $context.actions.redirect.statusCode);

        this._events.emit('redirect', $context.actions.redirect);

        return null;
      }

      return response.send(content);
    } catch (reason) {
      return this.errorHandler(request, response, reason);
    }
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

    if (typeof formatter !== 'function') {
      throw new errors.InternalServerError('Formatter is not a function');
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
  async forwarding(forward, $context) {
    const routes = this._routesByCollectionName[forward.collectionName];

    if (!routes) {
      const message = `Collection ${forward.collectionName} not found for forward`;

      throw new errors.InternalServerError(message, 'forwardCollectionNotFound');
    }

    const route = routes[forward.handleName];

    if (!route) {
      const message = `Handle ${forward.handleName} not found for forward`;
      throw new errors.InternalServerError(message, 'forwardCollectionNotFound');
    }

    this._events.emit('forwarding', `Forwarding to ${forward.collectionName}.${forward.handleName} ...`);

    const content = await route.handle($context);

    return await this.handleResultProcess(content, $context);
  }

  /**
   * Processing result
   *
   * @param {Object} content Result from route.handle
   * @param {Context} $context Current context
   * @returns {Promise} Promise
   */
  async handleResultProcess(content, $context) {
    if ($context.actions.notFound) {
      throw new errors.NotFoundError(
        $context.actions.notFound.message,
        $context.actions.notFound.code
      );
    }

    if ($context.actions.forward) {
      const forward = $context.actions.forward;

      $context.actions.forward = null;

      return await this.forwarding(forward, $context);
    }

    return content;
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
   * @param {Context} $context Current context
   * @returns {Promise} Promise
   */
  async notImplementedHandle($context) {
    if (this._locator.has('notImplementedHandler')) {
      const handler = this._locator.resolve('notImplementedHandler');

      return await handler($context);
    }

    throw new errors.NotImplementedError(`Resource or collection '${$context.request.getLocation().path}' not implemented in API`);
  }

  /**
   * Error handler for Router
   *
   * @param {IncomingMessage} request Current request
   * @param {ServerResponse} response Current response
   * @param {HttpError|*} error Error
   * @returns {void}
   */
  async errorHandler(request, response, error) {
    const $context = this._contextFactory.create(request, response);

    if (!error) {
      error = new errors.InternalServerError('Call error handler without error');
    }

    if (!(error instanceof Error)) {
      error = new Error(error);
    }

    this._events.emit('error', error);

    try {
      const content = await this.format(error, $context);

      if (!response.statusCode) {
        response.setStatus(typeof error.status === 'number' && error.status >= 100 ? error.status : 500);
      }

      response.send(content);
    } catch (error) {
      const content = `Internal Server Error: During the preparation of the
          response error in the formatter threw an exception. \n ${error}`;

      this._events.emit('error', new Error(content));

      response.setHeader('Content-Type', 'text/plain');
      response.setHeader('Content-Length', content.length);
      response.setStatus(500);

      response.send(content);
    }
  }

  /**
   * Initialization routes
   *
   * @returns {Promise} Promise resolved when get routes
   */
  async init() {
    const routes = await this._routesFactory.create();

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
  }
}

module.exports = RequestRouter;

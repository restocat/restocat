'use strict';

const Router = require('router');
const CustomError = require('./CustomError');

class RequestRouter extends Router {

  constructor(locator) {
    super();

    this._routesFactory = locator.resolve('routesFactory');
    this._events = locator.resolve('events')
  }

  /**
   * Incoming message handler
   *
   * @param req
   * @param res
   */
  requestListener(req, res) {
    this._events.emit('incomingMessage', req);

    this.use((req, res, next) => next(
      new CustomError.NotImplementedError(`Resource or collection '${req.url}' not implemented in API`)
    ));
    this.handle(req, res, err => this.finalRouterHandler(req, res, err));
  }

  /**
   * Final handler for Router
   *
   * @param req
   * @param res
   * @param error
   */
  finalRouterHandler(req, res, error) {
    const env = 'development';

    if (!error) {
      return;
    }

    if (!(error instanceof CustomError)) {

      const newError = new CustomError.InternalServerError(error.message);
      newError.stack = error.stack;

      error = newError;
    }

    res.statusCode = error.status;

    res.setHeader('X-Content-Type-Options', 'nosniff');

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

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: prepared}));
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
        routes.forEach(route => this.use(route));
      });
  }
}

module.exports = RequestRouter;

'use strict';

const http = require('http');
const HttpServer = http.Server;
const promises = require('./helpers/promises');
const CustomError = require('./CustomError');

require('./http/IncomingMessage');
require('./http/ServerResponse');

class Server {

  /**
   * Create instance of Substance
   *
   * @param {ServiceLocator} locator Locator
   */
  constructor(locator) {

    /**
     * Service Locator
     * @type {ServiceLocator}
     */
    this._locator = locator;

    /**
     * Global event bus
     *
     * @type {EventEmitter}
     * @private
     */
    this._events = locator.resolve('events');
    this._router = locator.resolve('requestRouter');
    this._httpServer = new HttpServer((req, res) => this._router.requestListener(req, res));
  }

  /**
   * Register formatter or middleware
   *
   * @param {String} type Type of registration instance (enum = [formatter,middleware])
   * @param {Object|Function} instance Instance
   * @returns {Server} Self
   */
  register(type, instance) {
    if (type !== 'formatter' && type !== 'middleware') {
      throw new CustomError.InternalServerError('Not allowed type for registration');
    }

    this._locator.registerInstance(type, instance);

    return this;
  }

  /**
   * Proxy method in Router
   *
   * Set middleware such as bodyParser, passport and etc.
   *
   * @param {Function} func Connect style middleware
   * @return {Server} Self
   */
  use(func) {
    this.register('middleware', promises.middlewareWrapper(func));

    return this;
  }

  /**
   * Init router
   *
   * @return {Promise} Promise that will resolve when the server will connect
   */
  listen(...args) {
    const def = Promise.defer();

    args.push(() => def.resolve());

    this._httpServer.once('error', error => def.reject(error));

    return this._router
      .init()
      .then(() => {
        this._httpServer.listen(...args);

        return def.promise;
      });
  }
}

module.exports = Server;

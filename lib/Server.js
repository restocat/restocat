'use strict';

const http = require('http');
const HttpServer = http.Server;

require('./http/IncomingMessage');
require('./http/ServerResponse');

class Server {

  /**
   * Create instance of Substance
   *
   * @param locator
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
   * Proxy method in Router
   *
   * Set middleware such as bodyParser, passport and etc.
   */
  use(...args) {
    this._router.middleware(...args);
  }

  /**
   * Init router
   *
   * @returns {Promise}
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

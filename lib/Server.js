const http = require('http');
const https = require('https');
const HttpServer = http.Server;
const HttpsServer = https.Server;
const promises = require('./helpers/promises');
const Promise = require('bluebird');

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

    const config = locator.resolve('config').server || {};
    const listener = (req, res) => this._router.requestListener(req, res);

    if (config.secure) {
      if (!config.cert || !config.key) {
        throw new TypeError('HTTPS require certificate and key');
      }

      this._httpServer = new HttpsServer(config, listener);
    } else {
      this._httpServer = new HttpServer(listener);
    }
  }

  /**
   * Alias for global service locator
   *
   * @param {String} type Type of registration instance
   * @param {Object|Function} instance Instance
   * @returns {Server} Self
   */
  register(type, instance) {
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
  async listen(...args) {
    await this._router.init();

    return new Promise((resolve, reject) => {
        args.push(() => resolve());

        this._httpServer.once('error', error => reject(error));
        this._httpServer.listen(...args);
    });
  }

  async close() {
    const closeHttpServer = promises.promisify(this._httpServer.close, this._httpServer);

    return await closeHttpServer();
  }
}

module.exports = Server;

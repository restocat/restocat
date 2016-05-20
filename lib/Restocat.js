'use strict';

const EventEmitter = require('events').EventEmitter;
const ServiceLocator = require('catberry-locator');
const CollectionFinder = require('./finders/CollectionsFinder');
const CollectionsLoader = require('./loaders/CollectionsLoader');
const ContextFactory = require('./context/ContextFactory');
const RoutesFactory = require('./router/RoutesFactory');
const RequestRouter = require('./router/RequestRouter');
const CustomError = require('./CustomError');
const http = require('http');
const packageJson = require('../package.json');

class Substance {

  /**
   * Create instance of Substance
   *
   * @param config
   */
  constructor(config = {}) {

    /**
     * Service Locator
     * @type {ServiceLocator}
     */
    this.locator = new ServiceLocator();

    /**
     * Current version
     *
     * @type {string}
     */
    this.version = packageJson.version;

    /**
     * Current config
     *
     * @type {Object}
     * @private
     */
    this._config = config;

    /**
     * Global event bus
     *
     * @type {EventEmitter}
     * @private
     */
    this._events = null;

    this._configure();

    this._router = this.locator.resolve('requestRouter');
  }

  /**
   * Registration instances in service locator
   *
   * @private
   */
  _configure() {
    this._events = new EventEmitter();
    this._events.setMaxListeners(0);

    this.locator.registerInstance('config', this._config);
    this.locator.registerInstance('events', this._events);

    this.locator.register('collectionsFinder', CollectionFinder, true);
    this.locator.register('collectionsLoader', CollectionsLoader, true);
    this.locator.register('contextFactory', ContextFactory, true);
    this.locator.register('routesFactory', RoutesFactory, true);
    this.locator.register('requestRouter', RequestRouter, true);
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
  ready() {
    return this._router.init();
  }

  /**
   * Create http server
   *
   * @return {Server} Instance of http server
   */
  createServer() {
    return http.createServer((req, res) => this._router.requestListener(req, res));
  }

  static get CustomError() {
    return CustomError;
  }
}

module.exports = Substance;

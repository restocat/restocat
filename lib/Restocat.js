'use strict';

const EventEmitter = require('events').EventEmitter;
const ServiceLocator = require('catberry-locator');
const CollectionFinder = require('./finders/CollectionsFinder');
const CollectionsLoader = require('./loaders/CollectionsLoader');
const ContextFactory = require('./context/ContextFactory');
const RoutesFactory = require('./router/RoutesFactory');
const RequestRouter = require('./router/RequestRouter');
const FormatterProvider = require('./FormatterProvider');
const Server = require('./Server');
const errors = require('./errors');
const Watcher = require('./Watcher');
const packageJson = require('../package.json');
const path = require('path');
const definedRoutesPath = path.join(process.cwd(), 'routes');
let routeDefinitions;

try {
  routeDefinitions = require(definedRoutesPath);
} catch (e) {
  routeDefinitions = {};
}

class Restocat {

  /**
   * Create instance of Substance
   *
   * @param {Object} config Config
   */
  constructor(config = {}) {

    /**
     * Service Locator
     * @type {ServiceLocator}
     */
    this.locator = new ServiceLocator();

    /**
     * HttpError constructors
     *
     * @type {Object}
     */
    this.errors = errors;

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
    this.events = null;

    this._configure();
  }

  /**
   * Registration instances in service locator
   *
   * @private
   * @returns {void}
   */
  _configure() {
    this.events = new EventEmitter();
    this.events.setMaxListeners(0);

    this.locator.registerInstance('errors', errors);
    this.locator.registerInstance('config', this._config);
    this.locator.registerInstance('events', this.events);
    this.locator.registerInstance('definedRoutes', routeDefinitions);

    this.locator.register('watcher', Watcher, true);
    this.locator.register('collectionsFinder', CollectionFinder, true);
    this.locator.register('collectionsLoader', CollectionsLoader, true);
    this.locator.register('contextFactory', ContextFactory, true);
    this.locator.register('routesFactory', RoutesFactory, true);
    this.locator.register('requestRouter', RequestRouter, true);
    this.locator.register('formatterProvider', FormatterProvider, true);

    // Initialization watcher
    this.locator.resolve('watcher');
  }

  /**
   * Create http server
   *
   * @return {Server} Instance of http server
   */
  createServer() {
    return new Server(this.locator);
  }

  /**
   * Errors export
   */
  static get errors() {
    return errors;
  }
}

module.exports = Restocat;

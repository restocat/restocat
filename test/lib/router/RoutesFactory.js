const assert = require('assert');
const EventEmitter = require('events').EventEmitter;
const ServiceLocator = require('catberry-locator');
const RoutesFactory = require('../../../lib/router/RoutesFactory');
const collectionsCases = require('../../cases/lib/router/RoutesFactory/collections');
const routesExpected = require('../../cases/lib/router/RoutesFactory/expected.json');
const definedRoutes = require('../../cases/lib/router/RoutesFactory/routes.js');
const ContextFactory = require('../../../lib/context/ContextFactory');
const CollectionLoader = require('../../mocks/loaders/CollectionsLoader');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/router/RoutesFactory', () => {
  it('#create', () => {
    const locator = new ServiceLocator();
    locator.registerInstance('serviceLocator', locator);
    locator.registerInstance('config', {isRelease: true});
    locator.registerInstance('definedRoutes', definedRoutes);

    const events = new EventEmitter();
    events.on('error', () => {});

    locator.registerInstance('events', events);
    locator.registerInstance('collectionsLoader', new CollectionLoader(collectionsCases));
    locator.register('contextFactory', ContextFactory);
    locator.register('routesFactory', RoutesFactory);

    const routesFactory = locator.resolve('routesFactory');

    return routesFactory.create().then(routes => {
      assert.equal(
        JSON.stringify(routes.map(route => route.toString())),
        JSON.stringify(routesExpected));
    });
  });
});

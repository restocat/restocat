const assert = require('assert');
const EventEmitter = require('events').EventEmitter;
const ServiceLocator = require('catberry-locator');
const ContextFactory = require('../../../lib/context/ContextFactory');
const Route = require('../../../lib/router/Route');
const CollectionLoader = require('../../mocks/loaders/CollectionsLoader');
const helpers = require('../../../lib/helpers');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/router/Route', () => {
  it('#match', () => {
    const collections = {
      Index: {
        constructor: class Index {
          list() {
          }
        }
      }
    };
    const definedRoutes = {Index: '/'};
    const locator = createLocator(collections, definedRoutes);
    const descriptor = {name: 'Index'};
    const handleName = 'foo';
    const endpoint = 'get /foo/:id/:param';
    const route = new Route(locator, descriptor, handleName, endpoint);
    const match = route.match('/foo/bar/loop');

    assert.deepEqual(
      {id: 'bar', param: 'loop'},
      match
    );
  });

  describe('#handle', () => {
    it('Main test', () => {
      const collections = {
        Index: {
          constructor: class Index {
            foo() {
              return 'success';
            }
          }
        }
      };
      const definedRoutes = {Index: '/'};
      const locator = createLocator(collections, definedRoutes);
      const handleName = 'foo';
      const endpoint = 'get /foo/:id/:param';
      const route = new Route(locator, {
        name: 'Index',
        constructor: collections.Index.constructor
      }, handleName, endpoint);

      return locator.resolve('collectionsLoader')
        .load()
        .then(() => {
          return route.handle(request(), null, null);
        })
        .then(content => {
          assert.equal(content, 'success');
        });
    });

    it('should have different $context in collection when the multiple requests at one time', () => {
      const uuids = [];
      const collections = {
        Index: {
          constructor: class Index {
            foo() {
              uuids.push(this.$context.request.uuid);
            }
          }
        }
      };
      const definedRoutes = {Index: '/'};
      const locator = createLocator(collections, definedRoutes);
      const handleName = 'foo';
      const endpoint = 'get /foo/:id/:param';
      const route = new Route(locator, {
        name: 'Index',
        constructor: collections.Index.constructor
      }, handleName, endpoint);

      return locator.resolve('collectionsLoader')
        .load()
        .then(() => {
          return Promise
            .all([
              route.handle({request: {uuid: helpers.uuid()}}, null, null),
              route.handle({request: {uuid: helpers.uuid()}}, null, null),
              route.handle({request: {uuid: helpers.uuid()}}, null, null)
            ])
            .then(() => {
              assert.equal(uuids.filter((uuid, index, array) => array.indexOf(uuid) === index).length, 3);
            });

        });
    });
  });
});

function request() {
  return {
    getLocation: () => {}
  };
}

function createLocator(collections, definedRoutes) {
  const locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('config', {isRelease: true});
  locator.registerInstance('definedRoutes', definedRoutes);

  const events = new EventEmitter();
  events.on('error', () => {});

  locator.registerInstance('events', events);
  locator.registerInstance('collectionsLoader', new CollectionLoader(collections));
  locator.register('contextFactory', ContextFactory);

  return locator;
}

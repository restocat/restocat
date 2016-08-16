'use strict';

const assert = require('assert');
const supertest = require('supertest');
const path = require('path');
const serverPath = path.resolve(`${__dirname}/cases/together`);
const collectionsGlob = 'test/cases/together/collections/**/collection.json';
const Context = require('../lib/context/Context');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
/* eslint no-sync: 0 */
/* eslint no-underscore-dangle: 0 */
describe('Server test', () => {

  let server = null;

  beforeEach(() => {
    const Restocat = require('../lib/Restocat');
    const restocat = new Restocat({
      isRelease: true,
      collectionsGlob
    });

    restocat.locator.registerInstance('definedRoutes', require(`${serverPath}/routes`));
    restocat.events.on('error', err => {});

    server = restocat.createServer();
  });

  describe('Forrmatter', () => {
    it('Error in formatter', () => {

      server.register('formatter', {
        'text/html;q=0.9'() {
          throw Error('SomeError');
        }
      });

      return server
        .listen()
        .then(() =>
          supertest(server._httpServer)
            .get('/')
            .expect(500)
        )
        .then(res => {
          assert.notEqual(res.text.indexOf('SomeError'), -1);
        });
    });

    it('$context in formatter instanceOf Context', () => {
      server.register('formatter', {
        'text/html;q=0.9'($context) {
          if (!($context instanceof Context)) {
            throw Error('SomeError');
          }

          return '{Foo: \'bar\'}';
        }
      });

      return server
        .listen()
        .then(() =>
          supertest(server._httpServer)
            .get('/')
            .expect(200)
        );
    });

    it('$context in formatter instanceOf Context after call errorHandler', () => {
      return new Promise((resolve, reject) => {
        server.register('formatter', {
          'text/html;q=0.9'($context) {
            if (!($context instanceof Context)) {
              reject('$context not instance of Context');
            }

            return resolve();
          }
        });

        server
          .listen()
          .then(() =>
            supertest(server._httpServer)
              .get('/notImpl')
          );
      });
    });
  });
});
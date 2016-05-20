'use strict';

const URI = require('catberry-uri').URI;
const CustomError = require('./../CustomError');
const Context = require('./Context');

class ContextFactory {

  /**
   * Creates a new instance of the context factory.
   * @param {ServiceLocator} locator Locator for resolving dependencies.
   */
  constructor(locator) {

    /**
     * Current service locator.
     * @type {ServiceLocator}
     * @private
     */
    this._locator = locator;
  }

  /**
   * Creates a new context for modules.
   * @param {IncomingMessage} request
   * @param {ServerResponse} response
   * @param {Object} additional Additional parameters.
   */
  create(request, response, additional) {
    const context = Object.create(new Context(this._locator));

    context.request = request;
    context.response = response;

    let location, referrer;

    try {
      location = new URI(request.url);
    } catch (e) {
      location = new URI();
    }

    try {
      const headers = request.headers || {};
      referrer = new URI(headers.referer || headers.referrer);
    } catch (e) {
      referrer = new URI();
    }

    if (request.headers) {
      location.authority = location.createAuthority(request.headers.host);
    }

    context.location = location;
    context.referrer = referrer;

    Object.keys(additional)
      .forEach(key => {
        Object.defineProperty(context, key, {
          enumerable: false,
          configurable: false,
          writable: false,
          value: additional[key]
        });
      });

    Object.freeze(context);

    return context;
  }
}

module.exports = ContextFactory;

'use strict';

const corePath = require('path');
const pathToRegexp = require('path-to-regexp');
const CustomError = require('../CustomError');

class Route {
  constructor(locator, descriptionCollection, handleName, endpoint) {

    this._locator = locator;
    this._collectionsLoader = this._locator.resolve('collectionsLoader');
    this._contextFactory = this._locator.resolve('contextFactory');
    this._events = this._locator.resolve('events');
    this._definedRoutes = locator.resolve('definedRoutes');

    const parts = endpoint.split(' ');
    const method = parts[0].toLowerCase();

    let path = corePath.join(this._definedRoutes[descriptionCollection.name], parts[1]);

    if (path[path.length - 1] === '/' && path.length !== 1) {
      path = path.slice(0, -1);
    }

    this.collectionName = descriptionCollection.name;
    this.handleName = handleName;
    this.method = method;
    this.path = path;
    this.keys = [];
    this.regexp = pathToRegexp(this.path, this.keys);

    if (this.path === '/') {
      this.fast_slash = true;
    }

    this.handle = this.createHandle(this.handleName, descriptionCollection.name);

    return this;
  }

  /**
   * Middleware for router
   *
   * @param handleName
   * @param collectionName
   */
  /* eslint max-params: 0 */
  createHandle(handleName, collectionName) {
    return (request, response, state) => {
      this._events.emit('debug', `Call handle ${handleName} in ${collectionName}`);

      const descriptor = this._collectionsLoader.getCollectionByName(collectionName);
      const additionalContext = {
        name: descriptor.name,
        handleName,
        state
      };
      const context = this._contextFactory.create(request, response, additionalContext);
      const constructor = descriptor.constructor;

      constructor.prototype.$context = context;

      const instance = new constructor(context.locator);

      if (!instance[handleName]) {
        const error = `Not found handler '${handleName}' in collection's logic file '${collectionName}'`;

        this._events.emit('error', error);

        return Promise.reject(new CustomError.InternalServerError(error));
      }

      instance[handleName].$context = context;

      return Promise.resolve(instance[handleName]())
        .then(result => {
          return {result, context};
        });
    };
  }

  match(path) {
    if (!path) {
      return false;
    }

    if (path === '/' && this.fast_slash) {
      return Object.create(null);
    }

    const results = this.regexp.exec(path);

    if (!results) {
      return false;
    }

    const params = Object.create(null);
    const keys = this.keys;

    for (let i = 1; i < results.length; i++) {
      const key = keys[i - 1];
      const prop = key.name;
      const value = decode_param(results[i]);

      if (value !== undefined || !(hasOwnProperty.call(params, prop))) {
        params[prop] = value;
      }
    }

    return params;
  }

  /**
   * Сreate a string representation of current route
   *
   * @returns {String} representation of current route
   */
  toString() {
    return `${this.method} ${this.path} | ${this.collectionName}.${this.handleName}`;
  }
}

/**
 * Decode param value.
 *
 * @param {string} value
 * @return {string}
 * @private
 */
function decode_param(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = `Failed to decode param '${value}'`;
      err.status = 400;
    }

    throw err;
  }
}

module.exports = Route;

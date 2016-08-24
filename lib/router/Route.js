'use strict';

const corePath = require('path');
const pathToRegexp = require('path-to-regexp');
const errors = require('../errors');
const Promise = require('bluebird');

class Route {
  constructor(locator, descriptionCollection, handleName, endpoint) {
    this._locator = locator;
    this._collectionsLoader = this._locator.resolve('collectionsLoader');
    this._events = this._locator.resolve('events');
    this._definedRoutes = locator.resolve('definedRoutes');

    this.init(descriptionCollection, handleName, endpoint);
  }

  init(descriptionCollection, handleName, endpoint) {
    const parts = endpoint.split(' ');

    if (parts.length < 2) {
      throw new errors.InternalServerError(`Invalid endpoint '${endpoint}'. Endpoint should be contain method and route (ex. 'get /some/:id')`);
    }

    const method = parts[0].toLowerCase();
    let path = corePath.join(this._definedRoutes[descriptionCollection.name], parts[1]);

    if (path[path.length - 1] === '/' && path.length !== 1) {
      path = path.slice(0, -1);
    }

    this.descriptor = descriptionCollection;
    this.collectionName = descriptionCollection.name;
    this.handleName = handleName;
    this.method = method;
    this.path = path;
    this.keys = [];
    this.regexp = pathToRegexp(this.path, this.keys);

    if (this.path === '/') {
      this.fast_slash = true;
    }
  }

  handle(context) {
    this._events.emit('debug', `Call handle ${this.handleName} in ${this.collectionName}`);

    const constructor = this.descriptor.constructor;

    constructor.prototype.$context = context;

    const instance = this._getInstance(constructor, context);

    if (instance instanceof Error) {
      return Promise.reject(new errors.InternalServerError(instance));
    }

    if (!instance[this.handleName]) {
      const error = `Not found handler '${this.handleName}' in collection's logic file '${this.collectionName}'`;

      this._events.emit('error', error);

      return Promise.reject(new errors.InternalServerError(error));
    }

    instance[this.handleName].$context = context;

    return Promise.resolve().then(() => instance[this.handleName]());
  }

  _getInstance(constructor, context) {
    try {
      return new constructor(context.locator);
    } catch (error) {
      if (!(error instanceof Error)) {
        return new Error(error);
      }

      return error;
    }
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
 * @param {string} value part of uri
 * @return {string} Decoded string
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

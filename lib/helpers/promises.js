'use strict';

const Promise = require('bluebird');

const helperPromises = {

  /**
   * Promisify
   *
   * @param {Function} original Callback
   * @param {*} thisArg Context
   * @returns {function()} Wrap callback
   */
  promisify(original, thisArg) {
    return (...args) => {
      return new Promise((resolve, reject) => {
        args.push((err, ...args) => err ? reject(err) : resolve(args));

        if (thisArg) {
          original.apply(thisArg, args);
        } else {
          original(...args);
        }
      });
    };
  },

  /**
   * Factory wrap of middleware function
   *
   * @param {Function} func middleware function
   * @returns {Function} wrap middleware
   */
  middlewareWrapper(func) {
    return function middlewareWrap($context) {
      return new Promise((resolve, reject) => {
        func($context.request, $context.response, err => err ? reject(err) : resolve());
      });
    };
  },

  /**
   * A serial call of promises
   *
   * @param {Array} promises Array of promises
   * @returns {Promise} Chain of promises
   */
  serial(promises) {
    return promises.reduce((previous, promise) => {
      return previous.then(promise);
    }, Promise.resolve());
  }
};

module.exports = helperPromises;

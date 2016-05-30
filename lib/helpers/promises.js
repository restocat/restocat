'use strict';

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
      const def = Promise.defer();

      args.push((err, ...args) => err ? def.reject(err) : def.resolve(args));

      if (thisArg) {
        original.apply(thisArg, args);
      } else {
        original(...args);
      }

      return def.promise;
    };
  },

  /**
   * Factory wrap of middleware function
   *
   * @param {Function} func middleware function
   * @returns {Function} wrap middleware
   */
  middlewareWrapper(func) {
    return function middlewareWrapp(request, response) {
      const def = Promise.defer();

      func(request, response, err => err ? def.reject(err) : def.resolve());

      return def.promise;
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

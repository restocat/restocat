'use strict';

const helperPromises = {

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

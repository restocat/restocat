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

  async safeFunctionCall(func, ...args) {
    if (typeof func !== 'function') {
      throw new TypeError('first argument must be a function');
    }

    const result = func(...args);

    if (result instanceof Promise) {
      return await result;
    }

    return result;
  }
};

module.exports = helperPromises;

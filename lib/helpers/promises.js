const helperPromises = {

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
  }
};

module.exports = helperPromises;

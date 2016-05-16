'use strict';

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
    this._service_locator = locator;
  }

  /**
   * Creates a new context for modules.
   * @param {Object} additional Additional parameters.
   * @param {URI} additional.referrer Current referrer.
   * @param {URI} additional.location Current location.
   * @param {string} additional.userAgent Current user agent.
   */
  create(additional) {
    const context = Object.create(null);
    Object.keys(additional)
      .forEach(key => {
        Object.defineProperty(context, key, {
          enumerable: false,
          configurable: false,
          writable: false,
          value: additional[key]
        });
      });
    return context;
  }
}

module.exports = ContextFactory;

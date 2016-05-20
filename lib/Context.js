'use strict';

class Context {

  /**
   * Creates a new instance of the context.
   *
   * @param {ServiceLocator} locator Locator for resolving dependencies.
   */
  constructor(locator) {

    /**
     * Current service locator.
     * @type {ServiceLocator}
     * @private
     */
    this.locator = locator;

    this.actions = {
      forward: null,
      notFound: null
    };
  }

  /**
   *
   * @param collectionName
   * @param handleName
   * @param additional
   */
  forward(collectionName, handleName, additional) {
    this.actions.forward = {collectionName, handleName, additional};

    return Promise.resolve();
  }

  /**
   *
   * @param message
   * @param code
   */
  notFound(message, code) {
    this.actions.notFound = {message, code};
    
    return Promise.resolve();
  }
}

module.exports = Context;

const httpErrors = require('../httpErrors');

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

    /**
     * Global event bus
     * @type {EventEmitter}
     * @private
     */
    this._events = locator.resolve('events');

    /**
     * httpErrors
     * @type {httpErrors} httpErrors
     */
    this.httpErrors = httpErrors;

    /**
     * Actions
     *
     * Used in router
     *
     * @private
     * @type {{forward: null, notFound: null, noSend: boolean, redirect: null}}
     */
    this.actions = {
      forward: null,
      notFound: null,
      redirect: null,
      notSend: false
    };
  }

  /**
   * Forwarding current request to another collection
   *
   * @param {String} collectionName Collection Name
   * @param {String} handleName Handle name
   * @returns {void}
   */
  forward(collectionName, handleName) {
    this.actions.forward = {collectionName, handleName};
  }

  /**
   * Response not found
   *
   * @param {String} message Error message
   * @param {String} code Error code
   * @returns {void}
   */
  notFound(message, code) {
    this.actions.notFound = {message, code};
  }

  /**
   * Http Redirect
   *
   * @param {String} uri Redirect uri
   * @param {String} statusCode http statusCode
   * @returns {void}
   */
  redirect(uri, statusCode) {
    this.actions.redirect = {uri, statusCode};
  }

  /**
   * Not response (response.send is not called)
   *
   * @returns {void}
   */
  notSend() {
    this.actions.notSend = true;
  }

  /**
   * Proxy Events on
   *
   * @return {void}
   */
  on(...args) {
    this._events.on(...args);
  }

  /**
   * Proxy Events once
   *
   * @return {void}
   */
  once(...args) {
    this._events.once(...args);
  }
}

module.exports = Context;

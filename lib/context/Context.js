'use strict';

const errors = require('../errors');
const Promise = require('bluebird');

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
     * Errors
     * @type {errors} Errors
     */
    this.errors = errors;

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
   * @returns {Promise} Resolved promise
   */
  forward(collectionName, handleName) {
    this.actions.forward = {collectionName, handleName};

    return Promise.resolve();
  }

  /**
   * Response not found
   *
   * @param {String} message Error message
   * @param {String} code Error code
   * @returns {Promise} Resolved promise
   */
  notFound(message, code) {
    this.actions.notFound = {message, code};

    return Promise.resolve();
  }

  /**
   * Http Redirect
   *
   * @param {String} uri Redirect uri
   * @param {String} statusCode http statusCode
   * @returns {Promise} Resolved promise
   */
  redirect(uri, statusCode) {
    this.actions.redirect = {uri, statusCode};

    return Promise.resolve();
  }

  /**
   * Not response (response.send is not called)
   *
   * @returns {Promise} Resolved promise
   */
  notSend() {
    this.actions.notSend = true;

    return Promise.resolve();
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

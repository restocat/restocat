const URI = require('catberry-uri').URI;
const Context = require('./Context');

class ContextFactory {

  /**
   * Creates a new instance of the context factory.
   *
   * @param {ServiceLocator} locator Locator for resolving dependencies.
   */
  constructor(locator) {

    /**
     * Current service locator.
     *
     * @type {ServiceLocator}
     * @private
     */
    this._locator = locator;
  }

  /**
   * Creates a new context for modules.
   *
   * @param {IncomingMessage} request Current request
   * @param {ServerResponse} response Current response
   * @param {Object} additional Additional parameters.
   * @returns {Context} return new context
   */
  create(request, response, additional) {
    const context = new Context(this._locator);

    context.request = request;
    context.response = response;

    let referrer;

    try {
      referrer = new URI(request.getHeader('referer'));
    } catch (e) {
      referrer = new URI();
    }

    context.location = request.getLocation();
    context.referrer = referrer;

    if (additional) {
      Object.keys(additional)
        .forEach(key => {
          Object.defineProperty(context, key, {
            enumerable: false,
            configurable: false,
            writable: false,
            value: additional[key]
          });
        });
    }

    Object.freeze(context);

    return context;
  }
}

module.exports = ContextFactory;

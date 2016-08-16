'use strict';

const defaultFormatters = require('./formatters');
const mime = require('mime');
const formatterNameSplitRegexp = /\s*;\s*/;

class FormatterProvider {

  constructor(locator) {
    this._locator = locator;

    this.formatters = null;
    this.acceptable = null;
  }

  /**
   * Preparing of formatters (merge default with user's formatters)
   *
   * @private
   * @returns {void}
   */
  _prepareFormatters() {
    let userFormatters;

    try {
      userFormatters = this._locator.resolveAll('formatter');
    } catch (e) {
      userFormatters = [];
    }

    userFormatters = userFormatters.reduce((result, userFormatter) => {
      Object.keys(userFormatter).forEach(contentType => {
        result[contentType] = userFormatter[contentType];
      });

      return result;
    }, Object.create(null));

    this._mergeFormatters(userFormatters);
  }

  /**
   * merge optional formatters with the default formatters to create a single
   * formatters object. the passed in optional formatters object looks like:
   * formatters: {
   *   'application/foo': function formatFoo(req, res, body) {...}
   * }
   * @private
   * @param    {Object} userFormatters user specified formatters object
   * @returns  {void}
   */
  _mergeFormatters(userFormatters) {
    let acceptable = [];
    const formatters = {};

    Object.keys(defaultFormatters)
      .forEach(formatterName => this._addFormatterTo(defaultFormatters, formatterName, acceptable, formatters));

    Object.keys(userFormatters)
      .forEach(formatterName => this._addFormatterTo(userFormatters, formatterName, acceptable, formatters));

    acceptable = acceptable
      .sort((a, b) => b.q - a.q)
      .map(a => a.name);

    this.formatters = formatters;
    this.acceptable = acceptable;
  }

  /**
   * Add formatter to acceptable, formatters
   *
   * @param {Object} source Source list of formatters
   * @param {String} formatterName Formatter's name
   * @param {Array} acceptable Acceptable list
   * @param {Object} formatters Destination list of formatters
   *
   * @returns {void}
   */
  _addFormatterTo(source, formatterName, acceptable, formatters) {
    let q = 1.0; // RFC 2616 sec14 - The default value is q=1
    let name = formatterName;

    if (formatterName.indexOf(';') !== -1) {
      const tmp = formatterName.split(formatterNameSplitRegexp);
      name = tmp[0];

      if (tmp[1].indexOf('q=') !== -1) {
        q = parseFloat(tmp[1].split('=')[1]);
      }
    }

    if (formatterName.indexOf('/') === -1) {
      formatterName = mime.lookup(formatterName);
    }

    formatters[name] = source[formatterName];

    acceptable.push({q, name});
  }

  /**
   * Return formatter
   *
   * @param {Context} context Current context
   * @returns {function} Formatter
   */
  getFormatter(context) {
    let formatter;

    if (this.formatters === null) {
      this._prepareFormatters();
    }

    let type = this._getContentType(context);

    if (!type) {
      return null;
    }

    if (!(formatter = this.formatters[type])) {
      if (type.indexOf('/') === -1) {
        type = mime.lookup(type);
      }

      if (this.acceptable.indexOf(type) === -1) {
        type = 'application/octet-stream';
      }

      formatter = this.formatters[type] || this.formatters['*/*'];
    }

    if (context.response.getCharSet()) {
      type = `${type}; charset=${context.response.getCharSet()}`;
    }

    context.response.setHeader('Content-Type', type);

    return formatter;
  }

  /**
   * Return content type
   *
   * @private
   * @param {Context} context Current context
   * @returns {String|null} Content type
   */
  _getContentType(context) {
    let type = context.response.getHeader('Content-Type');

    if (!type) {
      if (context.request.accepts(this.acceptable)) {
        type = context.request.accepts(this.acceptable);
      }

      if (!type) {
        // The importance of a status code outside of the
        // 2xx range probably outweighs that of unable being to
        // format the response body
        // TODO: Remove here sets to response
        if (context.response.statusCode >= 200 && context.response.statusCode < 300) {
          context.response.statusCode = 406;
        }

        return null;
      }
    } else if (type.indexOf(';') !== -1) {
      type = type.split(';')[0];
    }

    return type;
  }
}

module.exports = FormatterProvider;

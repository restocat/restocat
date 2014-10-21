/*!
 * Module dependencies.
 */

var ApiError = require('../error.js');
var errorMessages = ApiError.messages;

/**
 * Api token error
 *
 * @param {String} msg
 * @param {Number} code
 * @inherits ApiError
 * @api private
 */

function TokenError (msg, code) {
  if (!msg) msg = errorMessages.Token;

  ApiError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);

  this.name = 'TokenError';
  this.status = 403;
  this.code = code && code > 403000? code : 403000;
}

/*!
 * toString helper
 */

TokenError.prototype.toString = function () {
  return this.message;
};

/*!
 * Inherits from ApiError
 */

TokenError.prototype.__proto__ = ApiError.prototype;

/*!
 * exports
 */

module.exports = TokenError;

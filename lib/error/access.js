/*!
 * Module dependencies.
 */

var ApiError = require('../error.js');
var errorMessages = ApiError.messages;

/**
 * Api access error
 *
 * @param {String} msg
 * @param {Number} code
 * @inherits ApiError
 * @api private
 */

function AccessError (msg, code) {
  if (!msg) msg = errorMessages.Access;

  ApiError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);

  this.name = 'AccessError';
  this.status = 403;
  this.code = code && code > 403000? code : 403000;
}

/*!
 * toString helper
 */

AccessError.prototype.toString = function () {
  return this.message;
};

/*!
 * Inherits from ApiError
 */

AccessError.prototype.__proto__ = ApiError.prototype;

/*!
 * exports
 */

module.exports = AccessError;

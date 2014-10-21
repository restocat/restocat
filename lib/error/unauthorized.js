/*!
 * Module dependencies.
 */

var ApiError = require('../error.js');
var errorMessages = ApiError.messages;

/**
 * Api unauthorized error
 *
 * @param {String} msg
 * @param {Number} code
 * @inherits ApiError
 * @api private
 */

function UnauthorizedError (msg, code) {
  if (!msg) msg = errorMessages.Unauthorized;

  ApiError.call(this, msg);

  Error.captureStackTrace(this, arguments.callee);

  this.name = 'UnauthorizedError';
  this.status = 401;
  this.code = code && code > 401000? code : 401000;
}

/*!
 * toString helper
 */

UnauthorizedError.prototype.toString = function () {
  return this.message;
};

/*!
 * Inherits from ApiError
 */

UnauthorizedError.prototype.__proto__ = ApiError.prototype;

/*!
 * exports
 */

module.exports = UnauthorizedError;

/*!
 * Module dependencies.
 */

var ApiError = require('../error.js');
var errorMessages = ApiError.messages;

/**
 * Api not found error
 *
 * @param {String} msg
 * @param {Number} code
 * @inherits ApiError
 * @api private
 */

function NotAllowedError (msg, code) {
  if (!msg) msg = errorMessages.NotAllowed;

  ApiError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);

  this.name = 'NotAllowedError';
  this.status = 405;
  this.code = code && code > 405000? code : 405000;
}

/*!
 * toString helper
 */

NotAllowedError.prototype.toString = function () {
  return this.message;
};

/*!
 * Inherits from ApiError
 */

NotAllowedError.prototype.__proto__ = ApiError.prototype;

/*!
 * exports
 */

module.exports = NotAllowedError;

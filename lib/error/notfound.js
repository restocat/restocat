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

function NotFoundError (msg, code) {
  if (!msg) msg = errorMessages.NotFound;

  ApiError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);

  this.name = 'NotFoundError';
  this.status = 404;
  this.code = code && code > 404000? code : 404000;
}

/*!
 * toString helper
 */

NotFoundError.prototype.toString = function () {
  return this.message;
};

/*!
 * Inherits from ApiError
 */

NotFoundError.prototype.__proto__ = ApiError.prototype;

/*!
 * exports
 */

module.exports = NotFoundError;

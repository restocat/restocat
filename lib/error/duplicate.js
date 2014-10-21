/*!
 * Module dependencies.
 */

var ApiError = require('../error.js');
var errorMessages = ApiError.messages;

/**
 * Bad Duplicate error
 *
 * @param {String} msg
 * @param {Number} code
 * @inherits ApiError
 * @api private
 */

function DuplicateError (msg, code) {
  if (!msg) msg = errorMessages.Duplicate;

  ApiError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);

  this.name = 'DuplicateError';
  this.status = 409;
  this.code = code && code > 409000? code : 409000;
}

/*!
 * toString helper
 */

DuplicateError.prototype.toString = function () {
  return this.message;
};

/*!
 * Inherits from ApiError
 */

DuplicateError.prototype.__proto__ = ApiError.prototype;

/*!
 * exports
 */

module.exports = DuplicateError;

/*!
 * Module dependencies.
 */

var ApiError = require('../error.js');
var errorMessages = ApiError.messages;

/**
 * Bad Request error
 *
 * @param {String} msg
 * @param {Number} code
 * @inherits ApiError
 * @api private
 */

function RequestError (msg, code) {
  if (!msg) msg = errorMessages.Request;

  ApiError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);

  this.name = 'BadRequestError';
  this.status = 400;
  this.code = code && code > 400000? code : 400000;
}

/*!
 * toString helper
 */

RequestError.prototype.toString = function () {
  return this.message;
};

/*!
 * Inherits from ApiError
 */

RequestError.prototype.__proto__ = ApiError.prototype;

/*!
 * exports
 */

module.exports = RequestError;

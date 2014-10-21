/*!
 * Module requirements
 */

var ApiError = require('../error.js');

/**
 * Document Validation Error
 *
 * @api private
 * @param {String} msg
 * @param {Number} code
 * @inherits MongooseError
 */

function ValidationError (msg, code) {
  if (!msg) msg = errorMessages.Validation;

  ApiError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);

  this.name = 'ValidationError';
  this.status = 400;
  this.code = code && code > 400000? code : 400000;
};

/**
 * Console.log helper
 */

ValidationError.prototype.toString = function () {
  var ret = this.name + ': ';
  var msgs = [];

  Object.keys(this.errors).forEach(function (key) {
    if (this == this.errors[key]) return;
    msgs.push(String(this.errors[key]));
  }, this);

  return ret + msgs.join(', ');
};

/*!
 * Inherits from MongooseError.
 */

ValidationError.prototype.__proto__ = ApiError.prototype;

/*!
 * Module exports
 */

module.exports = exports = ValidationError;

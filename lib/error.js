var _ = require('lodash')
  , reg_index_name = /([\w\.]+\$[A-Za-z]+)/;

/**
 * ApiError constructor
 *
 * @param {String} msg Error message
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function ApiError (msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);

  this.message = msg;
  this.name = 'ApiError';
  this.status = 500;
  this.code = 500000;
}

/*!
 * Inherits from Error.
 */
ApiError.prototype.__proto__ = Error.prototype;

ApiError.prototype.fromAnotherError = function( error ){
  if(error.name == 'MongoError' && error.code == 11000){
    return new ApiError.Duplicate( error.err );
  }

  if(error.name == 'ValidationError'){
    var err = new ApiError.Validation( error.message );

    err.errors = error.errors;

    return err
  }

  return error;
};

/*!
 * Module exports.
 */

module.exports = exports = ApiError;

/**
 * The default built-in validator error messages.
 *
 * @see Error.messages #error_messages_MongooseError-messages
 * @api public
 */

ApiError.messages = require('./error/messages');

/*!
 * Expose subclasses
 */
ApiError.Access = require('./error/access');
ApiError.NotFound = require('./error/notfound');
ApiError.NotAllowed = require('./error/notallowed');
ApiError.Request = require('./error/request');
ApiError.Validation = require('./error/validation');
ApiError.Duplicate = require('./error/duplicate');
ApiError.Unauthorized = require('./error/unauthorized');
ApiError.Token = require('./error/token');


ApiError.errorHandler = function errorHandler(err, req, res, next){
  var env = process.env.NODE_ENV || 'development';

  if(_.isPlainObject(err)){
    if(env !== 'test') console.trace(err);
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(err));
    return;
  }

  if(err.name === 'MongoError' && err.code === 11000){
    var mongo_error = err;

    err = new ApiError.Duplicate();

    var index_name = mongo_error.err.match(reg_index_name);

    if( index_name.length > 1 ){
      index_name = index_name[1].replace(/\$/, '');
      var index_parts = index_name.split('.');

      if(index_parts.length > 2){
        index_parts.shift(); //убираем название БД

        err.errors = {};
        err.errors[index_parts.join('.')] = {
          message: "Value is dublicate",
          name: "DuplicateError",
          path: index_parts.join('.')
        }
      }
    }
  }

  res.status(err.status || 500);

  // write error to console
  if (env !== 'test') {
    console.trace(err.stack || String(err))
  }

  if (res._header) {
    return req.socket.destroy()
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');

  var error = { message: err.message, stack: err.stack };

  for (var prop in err) error[prop] = err[prop];

  if(env == 'production'){
    delete error.stack;
  }

  var json = JSON.stringify({ error: error });

  res.setHeader('Content-Type', 'application/json');
  res.end(json);
};

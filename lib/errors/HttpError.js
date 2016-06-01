'use strict';

/**
 * Classes of error
 *
 * These classes are adapted for response from the server with different codes
 */

class HttpError extends Error {
  constructor(name, message, status = 500, code = 'internalError') {
    super();

    this.name = name;
    this.status = Number(status);
    this.message = message;
    this.code = code;
  }
}

module.exports = HttpError;

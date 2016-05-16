'use strict';

/**
 * Classes of error
 *
 * These classes are adapted for response from the server with different codes
 */

class BadRequestError extends Error {
  constructor(msg = 'Bad Request', code = 'badRequest') {
    super();

    this.name = 'BadRequestError';
    this.status = 400;
    this.message = msg;
    this.code = code;
  }
}
class UnauthorizedError extends Error {
  constructor(msg = 'Unauthorized', code = 'Unauthorized') {
    super();

    this.name = 'UnauthorizedError';
    this.status = 401;
    this.message = msg;
    this.code = code;
  }
}
class NotFoundError extends Error {
  constructor(msg = 'Not Found', code = 'notFound') {
    super();

    this.name = 'NotFoundError';
    this.status = 404;
    this.message = msg;
    this.code = code;
  }
}
class MethodNotAllowedError extends Error {
  constructor(msg = 'Method Not Allowed', code = 'methodNotAllowed') {
    super();

    this.name = 'MethodNotAllowedError';
    this.status = 405;
    this.message = msg;
    this.code = code;
  }
}
class ConflictError extends Error {
  constructor(msg = 'Conflict', code = 'conflict') {
    super();

    this.name = 'ConflictError';
    this.status = 409;
    this.message = msg;
    this.code = code;
  }
}
class InternalServerError extends Error {
  constructor(msg = 'Internal Server Error', code = 'internalError') {
    super();

    this.name = 'InternalServerError';
    this.status = 500;
    this.message = msg;
    this.code = code;
  }
}
class NotImplementedError extends Error {
  constructor(msg = 'Not Implemented', code = 'notImplemented') {
    super();

    this.name = 'NotImplementedError';
    this.status = 501;
    this.message = msg;
    this.code = code;
  }
}

class CustomError extends Error {
  static get BadRequestError() {
    return BadRequestError;
  }

  static get UnauthorizedError() {
    return UnauthorizedError;
  }

  static get NotFoundError() {
    return NotFoundError;
  }

  static get MethodNotAllowedError() {
    return MethodNotAllowedError;
  }

  static get ConflictError() {
    return ConflictError;
  }

  static get InternalServerError() {
    return InternalServerError;
  }

  static get NotImplementedError() {
    return NotImplementedError;
  }

  constructor(name, message, status = 500, code = 'internalError') {
    super();

    this.name = name;
    this.status = status;
    this.message = message;
    this.code = code;
  }
}

module.exports = CustomError;

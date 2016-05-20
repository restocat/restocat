'use strict';

/**
 * Classes of error
 *
 * These classes are adapted for response from the server with different codes
 */

class CustomError extends Error {
  constructor(name, message, status = 500, code = 'internalError') {
    super();

    this.name = name;
    this.status = status;
    this.message = message;
    this.code = code;
  }
}

class BadRequestError extends CustomError {
  constructor(msg = 'Bad Request', code = 'badRequest') {
    super('BadRequestError', msg, 400, code);
  }
}
class UnauthorizedError extends CustomError {
  constructor(msg = 'Unauthorized', code = 'Unauthorized') {
    super('UnauthorizedError', msg, 401, code);
  }
}
class NotFoundError extends CustomError {
  constructor(msg = 'Not Found', code = 'notFound') {
    super('NotFoundError', msg, 404, code);
  }
}
class MethodNotAllowedError extends CustomError {
  constructor(msg = 'Method Not Allowed', code = 'methodNotAllowed') {
    super('MethodNotAllowedError', msg, 405, code);
  }
}
class ConflictError extends CustomError {
  constructor(msg = 'Conflict', code = 'conflict') {
    super('ConflictError', msg, 409, code);
  }
}
class InternalServerError extends CustomError {
  constructor(msg = 'Internal Server Error', code = 'internalError') {
    super('InternalServerError', msg, 500, code);
  }
}
class NotImplementedError extends CustomError {
  constructor(msg = 'Not Implemented', code = 'notImplemented') {
    super('NotImplementedError', msg, 501, code);
  }
}

CustomError.BadRequestError = BadRequestError;

CustomError.UnauthorizedError = UnauthorizedError;

CustomError.NotFoundError = NotFoundError;

CustomError.MethodNotAllowedError = MethodNotAllowedError;

CustomError.ConflictError = ConflictError;

CustomError.InternalServerError = InternalServerError;

CustomError.NotImplementedError = NotImplementedError;

module.exports = CustomError;

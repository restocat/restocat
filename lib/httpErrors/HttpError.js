/**
 * Classes of error
 *
 * These classes are adapted for response from the server with different codes
 */

class HttpError extends Error {
  constructor(name, message, status = 500, code = 'internalError') {
    super();

    if (message instanceof Error) {
      message = message.toString();
    }

    this.name = name;
    this.status = Number(status);
    this.message = message;
    this.code = code;
  }

  toObject() {
    return {
      name: this.name,
      status: this.status,
      message: this.message,
      code: this.code
    };
  }

  toJSON() {
    return this.toObject();
  }

  toString() {
    return `${this.name}: ${this.message}`;
  }
}

module.exports = HttpError;

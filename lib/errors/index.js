'use strict';

const http = require('http');
const HttpError = require('./HttpError');

module.exports = Object.keys(http.STATUS_CODES).reduce((errors, statusCode) => {

  const parsedCode = parseInt(statusCode, 10);
  const description = http.STATUS_CODES[statusCode];

  if (parsedCode >= 400) {
    let pieces = description.split(/\s+/);

    pieces = pieces.map(piece => piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase());

    let name = pieces.join('');

    // strip all non word characters
    name = name.replace(/\W+/g, '');

    const code = name;

    // append 'Error' at the end of it only if it doesn't already end with it.
    if (!name.endsWith('Error')) {
      name += 'Error';
    }

    errors[name] = class extends HttpError {
      constructor() {
        super(name, description, statusCode, code);
      }
    };

    errors[name].displayName = name;
  }

  return errors;
}, Object.create(null));

module.exports.HttpError = HttpError;

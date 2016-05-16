'use strict';

const response_helpers = {

  /**
   * @param {string|number|boolean|object} object
   * @param {http.ServerResponse} response
   * @public
   */
  send: function send(object, response) {
    const json = JSON.stringify(object);

    response.writeHead(response.statusCode || 200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache'
    });
    response.end(json);
  }
};

module.exports = response_helpers;

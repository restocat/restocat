'use strict';

/**
 * JSON formatter.
 *
 * @public
 * @function formatJSON
 * @param    {Context} context Current context
 * @param    {Object} data response body
 * @returns  {String} Response string
 */
function formatJSON(context, data) {
  if (Buffer.isBuffer(data)) {
    data = data.toString('base64');
  }

  data = JSON.stringify(data);

  context.response.setHeader('Content-Length', Buffer.byteLength(data));

  return data;
}

module.exports = formatJSON;

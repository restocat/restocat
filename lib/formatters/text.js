'use strict';

/**
 * Plain text formatter
 * @public
 * @function formatJSONP
 * @param    {Context} context
 * @param    {Object} data response body
 * @returns  {String}
 */
function formatText(context, data) {
  context.response.setHeader('Content-Length', Buffer.byteLength(data));

  return data;
}

module.exports = formatText;

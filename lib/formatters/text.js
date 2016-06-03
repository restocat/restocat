'use strict';

/**
 * Plain text formatter
 * @public
 * @function formatJSONP
 * @param    {Context} context Current context
 * @param    {Object} data response body
 * @returns  {String} Response string
 */
function formatText(context, data) {
  const string = String(data);

  context.response.setHeader('Content-Length', Buffer.byteLength(string));

  return string;
}

module.exports = formatText;

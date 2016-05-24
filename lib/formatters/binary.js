'use strict';

/**
 * binary formatter.
 *
 * @public
 * @function formatBinary
 * @param    {Context} context
 * @param    {Object} data response body
 * @returns  {Buffer}
 */
function formatBinary(context, data) {
  if (!Buffer.isBuffer(data)) {
    data = new Buffer(data.toString());
  }

  context.response.setHeader('Content-Length', data.length);

  return data;
}

module.exports = formatBinary;

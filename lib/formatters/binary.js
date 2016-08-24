'use strict';

/**
 * binary formatter.
 *
 * @public
 * @function formatBinary
 * @param    {Context} $context Current context
 * @param    {Object} data response body
 * @returns  {Buffer} Buffer for response
 */
function formatBinary($context, data) {
  const errors = $context.locator.resolve('errors');

  if (data instanceof Error) {
    if (!(data instanceof errors.HttpError)) {
      data = new errors.InternalServerError(String(data));
    }

    $context.response.setStatus(data.status);
  }

  if (!Buffer.isBuffer(data)) {
    data = new Buffer(String(data));
  }

  $context.response.setHeader('Content-Type', 'application/octet-stream');
  $context.response.setHeader('Content-Length', data.length);

  return data;
}

module.exports = formatBinary;

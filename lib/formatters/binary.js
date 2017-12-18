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
  const httpErrors = $context.locator.resolve('httpErrors');

  if (data instanceof Error) {
    if (!(data instanceof httpErrors.HttpError)) {
      data = new httpErrors.InternalServerError(String(data));
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

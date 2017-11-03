/**
 * JSON formatter.
 *
 * @public
 * @function formatJSON
 * @param    {Context} $context Current context
 * @param    {Object} data response body
 * @returns  {String} Response string
 */
function formatJSON($context, data) {
  const errors = $context.locator.resolve('errors');

  if (Buffer.isBuffer(data)) {
    data = data.toString('base64');
  }

  if (data instanceof Error) {
    if (!(data instanceof errors.HttpError)) {
      data = new errors.InternalServerError(String(data));
    }

    $context.response.setStatus(data.status);
  }

  data = JSON.stringify(data);

  $context.response.setHeader('Content-Type', 'application/json');
  $context.response.setHeader('Content-Length', Buffer.byteLength(data));

  return data;
}

module.exports = formatJSON;

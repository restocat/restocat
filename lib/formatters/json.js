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
  const httpErrors = $context.locator.resolve('httpErrors');

  if (Buffer.isBuffer(data)) {
    data = data.toString('base64');
  }

  if (data instanceof Error) {
    if (!(data instanceof httpErrors.HttpError)) {
      data = new httpErrors.InternalServerError(String(data));
    }

    $context.response.setStatus(data.status);
  }

  data = JSON.stringify(data);

  $context.response.setHeader('Content-Type', 'application/json');
  $context.response.setHeader('Content-Length', Buffer.byteLength(data));

  return data;
}

module.exports = formatJSON;

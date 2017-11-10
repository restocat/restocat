/**
 * Plain text formatter
 * @public
 * @function formatJSONP
 * @param    {Context} $context Current context
 * @param    {Object} data response body
 * @returns  {String} Response string
 */
function formatText($context, data) {
  const errors = $context.locator.resolve('errors');

  if (data instanceof Error) {
    if (!(data instanceof errors.HttpError)) {
      data = new errors.InternalServerError(String(data));
    }

    $context.response.setStatus(data.status);
  }

  const string = String(data);

  $context.response.setHeader('Content-Type', 'text/plain');
  $context.response.setHeader('Content-Length', Buffer.byteLength(string));

  return string;
}

module.exports = formatText;

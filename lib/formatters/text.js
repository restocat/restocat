/**
 * Plain text formatter
 * @public
 * @function formatJSONP
 * @param    {Context} $context Current context
 * @param    {Object} data response body
 * @returns  {String} Response string
 */
function formatText($context, data) {
  const httpErrors = $context.locator.resolve('httpErrors');

  if (data instanceof Error) {
    if (!(data instanceof httpErrors.HttpError)) {
      data = new httpErrors.InternalServerError(String(data));
    }

    $context.response.setStatus(data.status);
  }

  const string = String(data);

  $context.response.setHeader('Content-Type', 'text/plain');
  $context.response.setHeader('Content-Length', Buffer.byteLength(string));

  return string;
}

module.exports = formatText;

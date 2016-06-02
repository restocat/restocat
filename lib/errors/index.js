'use strict';

const http = require('http');
const HttpError = require('./HttpError');

/**
 * Errors
 *
 * @type {{
 *    BadRequestError: BadRequestError,
 *    UnauthorizedError: UnauthorizedError,
 *    PaymentRequiredError: PaymentRequiredError,
 *    ForbiddenError: ForbiddenError,
 *    NotFoundError: NotFoundError,
 *    MethodNotAllowedError: MethodNotAllowedError,
 *    NotAcceptableError: NotAcceptableError,
 *    ProxyAuthenticationRequiredError: ProxyAuthenticationRequiredError,
 *    RequestTimeoutError: RequestTimeoutError,
 *    ConflictError: ConflictError,
 *    GoneError: GoneError,
 *    LengthRequiredError: LengthRequiredError,
 *    PreconditionFailedError: PreconditionFailedError,
 *    PayloadTooLargeError: PayloadTooLargeError,
 *    UriTooLongError: UriTooLongError,
 *    UnsupportedMediaTypeError: UnsupportedMediaTypeError,
 *    RangeNotSatisfiableError: RangeNotSatisfiableError,
 *    ExpectationFailedError: ExpectationFailedError,
 *    ImATeapotError: ImATeapotError,
 *    MisdirectedRequestError: MisdirectedRequestError,
 *    UnprocessableEntityError: UnprocessableEntityError,
 *    LockedError: LockedError,
 *    FailedDependencyError: FailedDependencyError,
 *    UnorderedCollectionError: UnorderedCollectionError,
 *    UpgradeRequiredError: UpgradeRequiredError,
 *    PreconditionRequiredError: PreconditionRequiredError,
 *    TooManyRequestsError: TooManyRequestsError,
 *    RequestHeaderFieldsTooLargeError: RequestHeaderFieldsTooLargeError,
 *    UnavailableForLegalReasonsError: UnavailableForLegalReasonsError,
 *    InternalServerError: InternalServerError,
 *    NotImplementedError: NotImplementedError,
 *    BadGatewayError: BadGatewayError,
 *    ServiceUnavailableError: ServiceUnavailableError,
 *    GatewayTimeoutError: GatewayTimeoutError,
 *    HttpVersionNotSupportedError: HttpVersionNotSupportedError,
 *    VariantAlsoNegotiatesError: VariantAlsoNegotiatesError,
 *    InsufficientStorageError: InsufficientStorageError,
 *    LoopDetectedError: LoopDetectedError,
 *    BandwidthLimitExceededError: BandwidthLimitExceededError,
 *    NotExtendedError: NotExtendedError,
 *    NetworkAuthenticationRequiredError: NetworkAuthenticationRequiredError,
 *    HttpError: HttpError
 * }}
 */
module.exports = Object.keys(http.STATUS_CODES).reduce((errors, statusCode) => {

  const parsedCode = parseInt(statusCode, 10);
  const description = http.STATUS_CODES[statusCode];

  if (parsedCode >= 400) {
    let pieces = description.split(/\s+/);

    pieces = pieces.map(piece => piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase());

    let name = pieces.join('');

    // strip all non word characters
    name = name.replace(/\W+/g, '');

    const code = name;

    // append 'Error' at the end of it only if it doesn't already end with it.
    if (!name.endsWith('Error')) {
      name += 'Error';
    }

    errors[name] = class extends HttpError {
      constructor(message = description, errorCode = code) {
        super(name, message, statusCode, errorCode);
      }
    };

    errors[name].displayName = name;
  }

  return errors;
}, Object.create(null));

module.exports.HttpError = HttpError;

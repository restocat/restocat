'use strict';

const http = require('http');
const url = require('url');
const assert = require('assert-plus');
const mime = require('mime');
const formatters = require('../formatters');
const InternalServerError = require('../CustomError').InternalServerError;
const JSON_CONTENT_TYPE_REG = /application\/json/;

const ServerResponse = http.ServerResponse;

/*
 * CUSTOM METHODS AND REWRITE
 */

/**
 * sets the cache-control header. `type` defaults to _public_,
 * and options currently only takes maxAge.
 * @public
 * @function cache
 * @param    {String} type    value of the header
 * @param    {Object} options an options object
 * @returns  {String}         the value set to the header
 */
ServerResponse.prototype.cache = function cache(type, options) {
  if (typeof (type) !== 'string') {
    options = type;
    type = 'public';
  }

  if (options && options.maxAge !== undefined) {
    assert.number(options.maxAge, 'options.maxAge');
    type += ', max-age=' + options.maxAge;
  }

  return this.header('Cache-Control', type);
};

/**
 * turns off all cache related headers.
 * @public
 * @function noCache
 * @returns  {Object} self, the response object
 */
ServerResponse.prototype.noCache = function noCache() {
  // HTTP 1.1
  this.header('Cache-Control', 'no-cache, no-store, must-revalidate');

  // HTTP 1.0
  this.header('Pragma', 'no-cache');

  // Proxies
  this.header('Expires', '0');

  return this;
};

/**
 * Appends the provided character set to the response's Content-Type.
 * e.g., res.charSet('utf-8');
 * @public
 * @function charSet
 * @param    {String} type char-set value
 * @returns  {Object} self, the response object
 */
ServerResponse.prototype.charSet = function charSet(type) {
  assert.string(type, 'charset');

  this._charSet = type;

  return this;
};

/**
 * the response formatter. formats the response in preparation to send it off.
 * callback only used in async formatters. restify does not ship with any
 * async formatters currently.
 * @public
 * @function format
 * @param    {Object | String} body the response body to format
 * @param    {Function}        cb   callback function
 * @returns  {undefined}
 */
ServerResponse.prototype.getFormatter = function format(body) {
  let formatter;
  let type = this.getHeader('Content-Type');

  if (!type) {
    if (this.req.accepts(this.acceptable)) {
      type = this.req.accepts(this.acceptable);
    }

    if (!type) {
      // The importance of a status code outside of the
      // 2xx range probably outweighs that of unable being to
      // format the response body
      if (this.statusCode >= 200 && this.statusCode < 300) {
        this.statusCode = 406;
      }

      return null;
    }
  } else if (type.indexOf(';') !== '-1') {
    type = type.split(';')[0];
  }

  if (!(formatter = this.formatters[type])) {
    if (type.indexOf('/') === -1) {
      type = mime.lookup(type);
    }

    if (this.acceptable.indexOf(type) === -1) {
      type = 'application/octet-stream';
    }

    formatter = this.formatters[type] || this.formatters['*/*'];
  }

  if (this._charSet) {
    type = `${type}; charset=${this._charSet}`;
  }

  this.setHeader('Content-Type', type);

  return formatter;
};

/**
 * retrieves all headers off the response.
 * @public
 * @function getHeaders
 * @returns  {Object}
 */
ServerResponse.prototype.getHeaders = function getHeaders() {
  return (this._headers || {});
};

/* eslint no-underscore-dangle: 0 */
ServerResponse.prototype._setHeader = ServerResponse.prototype.setHeader;

/**
 * sets headers on the response.
 * @public
 * @function header
 * @param    {String} name  the name of the header
 * @param    {String} value the value of the header
 * @returns  {Object}
 */
ServerResponse.prototype.setHeader = function header(name, value) {
  assert.string(name, 'name');

  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    value = value.toUTCString();
  }

  const current = this.getHeader(name);

  // don't use comma separated values for set-cookie, see
  // http://tools.ietf.org/html/rfc6265#section-3
  if (current && name.toLowerCase() !== 'set-cookie') {
    if (Array.isArray(current)) {
      current.push(value);
      value = current;
    } else {
      value = [current, value];
    }
  }

  this._setHeader(name, value);
  return value;
};

/**
 * short hand method for:
 *     res.contentType = 'json';
 *     res.send({hello: 'world'});
 *
 * @public
 * @function json
 * @param    {Number} code    http status code
 * @param    {Object} object  value to json.stringify
 * @param    {Object} headers headers to set on the response
 * @returns  {Object}
 */
ServerResponse.prototype.json = function json(code, object, headers) {
  if (!JSON_CONTENT_TYPE_REG.test(this.getHeader('content-type'))) {
    this.setHeader('Content-Type', 'application/json');
  }

  return this.send(code, object, headers);
};

/**
 * sets the link header.
 *
 * @public
 * @function setLinkHeader
 * @param    {String} l   the link key
 * @param    {String} rel the link value
 * @returns  {String}     the header value set to res
 */
ServerResponse.prototype.setLinkHeader = function setLinkHeader(l, rel) {
  assert.string(l, 'link');
  assert.string(rel, 'rel');

  return this.setHeader('Link', `<${l}}>; rel="${rel}"`);
};

/**
 * sends the response object. convenience method that handles:
 *     writeHead(), write(), end()
 * @public
 * @function send
 * @param    {Number} code                      http status code
 * @param    {Object | Buffer | Error} body     the content to send
 * @param    {Object}                  headers  any add'l headers to set
 * @returns  {Object}                           self, the response object
 */
ServerResponse.prototype.send = function send(code, body, headers) {
  const isHead = this.req.method === 'HEAD';

  if (code === undefined) {
    this.statusCode = 200;
  } else if (code.constructor.name === 'Number') {
    this.statusCode = code;

    if (body instanceof Error) {
      body.statusCode = this.statusCode;
    }
  } else {
    headers = body;
    body = code;
    code = null;
  }

  headers = headers || {};

  this._data = body;

  Object.keys(headers).forEach(k => this.setHeader(k, headers[k]));

  this.writeHead(this.statusCode);

  if (this._data && !(isHead || code === 204 || code === 304)) {
    this.write(this._data);
  }

  this.end();

  return this;
};

/**
 * sets the http status code on the response.
 * @public
 * @function setStatus
 * @param    {Number} code http status code
 * @returns  {Number}     the status code passed in
 */
ServerResponse.prototype.setStatus = function setStatus(code) {
  assert.number(code, 'code');

  this.statusCode = code;

  return code;
};

/**
 * toString() serialization.
 * @public
 * @function toString
 * @returns  {String}
 */
ServerResponse.prototype.toString = function toString() {
  const headers = this.getHeaders();
  let headerString = '';

  Object.keys(headers).forEach(k =>
    (headerString += `${k}: ${headers[k]}\n`)
  );

  return `HTTP/1.1 ${this.statusCode} ${http.STATUS_CODES[this.statusCode]}\n${headerString}`;
};

/* eslint no-underscore-dangle: 0 */
ServerResponse.prototype._writeHead = ServerResponse.prototype.writeHead;

/**
 * pass through to native response.writeHead()
 * @public
 * @function writeHead
 * @returns  {undefined}
 */
ServerResponse.prototype.writeHead = function restifyWriteHead(...args) {
  this.emit('header');

  if (this.statusCode === 204 || this.statusCode === 304) {
    this.removeHeader('Content-Length');
    this.removeHeader('Content-MD5');
    this.removeHeader('Content-Type');
    this.removeHeader('Content-Encoding');
  }

  this._writeHead(...args);
};

/*
 * redirect is sugar method for redirecting. takes a few different signatures:
 * 1) res.redirect(301, 'www.foo.com', next);
 * 2) res.redirect('www.foo.com', next);
 * 3) res.redirect({...}, next);
 * `next` is mandatory, to complete the response and trigger audit logger.
 * @public
 * @param    {Number | String}   arg1 the status code or url to direct to
 * @param    {String | Function} arg2 the url to redirect to, or `next` fn
 * @param    {Function}          arg3 `next` fn
 * @function redirect
 * @return   {undefined}
 */
ServerResponse.prototype.redirect = function redirect(arg1, arg2, arg3) {

  const self = this;
  let statusCode = 302;
  let finalUri;
  let next;

  // 1) this is signature 1, where an explicit status code is passed in.
  //    MUST guard against null here, passing null is likely indicative
  //    of an attempt to call res.redirect(null, next);
  //    as a way to do a reload of the current page.
  if (arg1 && !isNaN(arg1)) {
    statusCode = arg1;
    finalUri = arg2;
    next = arg3;
  }

  // 2) this is signaure number 2
  else if (typeof (arg1) === 'string') {
    // otherwise, it's a string, and use it directly
    finalUri = arg1;
    next = arg2;
  }

  // 3) signature number 3, using an options object.
  else if (typeof (arg1) === 'object') {

    // set next, then go to work.
    next = arg2;

    const req = self.req;
    const opt = arg1 || {};
    const currentFullPath = req.href();
    const secure = (opt.hasOwnProperty('secure')) ? opt.secure : req.isSecure();

    // if hostname is passed in, use that as the base,
    // otherwise fall back on current url.
    const parsedUri = url.parse(opt.hostname || currentFullPath, true);

    // create the object we'll use to format for the final uri.
    // this object will eventually get passed to url.format().
    // can't use parsedUri to seed it, as it confuses the url module
    // with some existing parsed state. instead, we'll pick the things
    // we want and use that as a starting point.
    finalUri = {
      port: parsedUri.port,
      hostname: parsedUri.hostname,
      query: parsedUri.query,
      pathname: parsedUri.pathname
    };

    // start building url based on options.
    // first, set protocol.
    finalUri.protocol = (secure === true) ? 'https' : 'http';

    // then set host
    if (opt.hostname) {
      finalUri.hostname = opt.hostname;
    }

    // then set current path after the host
    if (opt.pathname) {
      finalUri.pathname = opt.pathname;
    }

    // then add query params
    if (opt.query) {
      if (opt.overrideQuery === true) {
        finalUri.query = opt.query;
      } else {
        finalUri.query = utils.mergeQs(opt.query, finalUri.query);
      }
    }

    // change status code to 301 permanent if specified
    if (opt.permanent) {
      statusCode = 301;
    }
  }

  // if we're missing a next we should probably throw. if user wanted
  // to redirect but we were unable to do so, we should not continue
  // down the handler stack.
  assert.func(next, 'res.redirect() requires a next param');

  // if we are missing a finalized uri
  // by this point, pass an error to next.
  if (!finalUri) {
    return (next(new InternalServerError('could not construct url')));
  }

  // now we're done constructing url, send the res
  self.send(statusCode, null, {
    location: url.format(finalUri)
  });

  // tell server to stop processing the handler stack.
  return (next(false));
};

module.exports = ServerResponse;

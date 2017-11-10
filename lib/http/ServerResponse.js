const http = require('http');
const url = require('url');
const mime = require('mime');
const formatters = require('../formatters');
const JSON_CONTENT_TYPE_REG = /application\/json/;

const ServerResponse = http.ServerResponse;

/**
 * Headers that cannot be multi-values.
 *
 * @see http://tools.ietf.org/html/rfc6265#section-3
 */
var HEADER_ARRAY_BLACKLIST = {
  'set-cookie': true,
  'content-type': true,
  'content-length': true
};

/*
 * CUSTOM METHODS AND REWRITE
 */

/**
 * returns ms since epoch when request was setup.
 * @public
 * @function getTime
 * @returns {Number} time
 */
ServerResponse.prototype.getTime = function getTime() {
  return this.time;
};

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
    type += `, max-age=${options.maxAge}`;
  }

  return this.setHeader('Cache-Control', type);
};

/**
 * turns off all cache related headers.
 * @public
 * @function noCache
 * @returns  {Object} self, the response object
 */
ServerResponse.prototype.noCache = function noCache() {
  // HTTP 1.1
  this.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // HTTP 1.0
  this.setHeader('Pragma', 'no-cache');

  // Proxies
  this.setHeader('Expires', '0');

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
  this._charSet = type;

  return this;
};

/**
 * get char set
 * @public
 * @function getCharSet
 * @returns  {String} char set
 */
ServerResponse.prototype.getCharSet = function getCharSet() {
  return this._charSet;
};

/**
 * retrieves all headers off the response.
 * @public
 * @function getHeaders
 * @returns  {Object} headers
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
 * @returns  {Object} value
 */
ServerResponse.prototype.setHeader = function header(name, value) {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    value = value.toUTCString();
  }

  const current = this.getHeader(name);

  if (current && !(name.toLowerCase() in HEADER_ARRAY_BLACKLIST)) {
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
 * @returns  {Object} self, the response object
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
 * @param    {String} linkKey   the link key
 * @param    {String} rel the link value
 * @returns  {String}     the header value set to res
 */
ServerResponse.prototype.setLinkHeader = function setLinkHeader(linkKey, rel) {
  return this.setHeader('Link', `<${linkKey}}>; rel="${rel}"`);
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

  if (this._data && !(this.statusCode === 204 || this.statusCode === 304)) {
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
  this.statusCode = code;

  return code;
};

/**
 * toString() serialization.
 * @public
 * @function toString
 * @returns  {String} string of response
 */
ServerResponse.prototype.toString = function toString() {
  return `HTTP/1.1 ${this.statusCode} ${http.STATUS_CODES[this.statusCode]}`;
};

/* eslint no-underscore-dangle: 0 */
ServerResponse.prototype._writeHead = ServerResponse.prototype.writeHead;

/**
 * pass through to native response.writeHead()
 * @public
 * @function writeHead
 * @returns {void}
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

/**
 * http redirect
 * @public
 * @function redirect
 * @param {String} uri URI
 * @param {Number} statusCode Status code
 * @returns {void}
 */
ServerResponse.prototype.redirect = function redirect(uri, statusCode) {
  this.setHeader('Location', uri);
  this.setHeader('Content-Length', 0);
  this.send(statusCode || 302);
};

module.exports = ServerResponse;

'use strict';

const defaultFormatters = require('../formatters');
const assert = require('assert-plus');
const mime = require('mime');

/**
 * merge optional formatters with the default formatters to create a single
 * formatters object. the passed in optional formatters object looks like:
 * formatters: {
 *   'application/foo': function formatFoo(req, res, body) {...}
 * }
 * @private
 * @function mergeFormatters
 * @param    {Object} userFormatters user specified formatters object
 * @returns  {Object}
 */
function mergeFormatters(userFormatters) {
  let acceptable = [];
  const formatters = {};

  userFormatters = userFormatters || {};

  Object.keys(defaultFormatters)
    .forEach(formatterName => addFormatterTo(defaultFormatters, formatterName, acceptable, formatters));

  Object.keys(userFormatters || {})
    .forEach(formatterName => addFormatterTo(userFormatters, formatterName, acceptable, formatters));

  acceptable = acceptable
    .sort((a, b) => b.q - a.q)
    .map(a => a.t);

  return ({
    formatters,
    acceptable
  });
}

/**
 * Add formatter to acceptable, formatters
 *
 * @param source
 * @param formatterName
 * @param acceptable
 * @param formatters
 */
function addFormatterTo(source, formatterName, acceptable, formatters) {
  assert.func(source[formatterName], 'formatter');

  let q = 1.0; // RFC 2616 sec14 - The default value is q=1
  let t = formatterName;

  if (formatterName.indexOf(';') !== -1) {
    const tmp = formatterName.split(/\s*;\s*/);
    t = tmp[0];

    if (tmp[1].indexOf('q=') !== -1) {
      q = parseFloat(tmp[1].split('=')[1]);
    }
  }

  if (formatterName.indexOf('/') === -1) {
    formatterName = mime.lookup(formatterName);
  }

  formatters[t] = source[formatterName];

  acceptable.push({q, t});
}

module.exports = {
  mergeFormatters
};

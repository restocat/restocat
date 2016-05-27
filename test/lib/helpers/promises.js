'use strict';

/* eslint-env node, mocha */

const assert = require('assert');
const promisesHelper = require('../../../lib/helpers/promises');

/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/helpers/promises', () => {
  it('#serial', () => {
    const result = [];
    const promises = [
      () => new Promise(fulfill => setTimeout(() => fulfill(result.push(1)), 5)),
      () => new Promise(fulfill => setTimeout(() => fulfill(result.push(2)), 0)),
      () => new Promise(fulfill => setTimeout(() => fulfill(result.push(3)), 2))
    ];

    return promisesHelper
      .serial(promises)
      .then(() => assert.equal(result.join(''), '123'));
  });

  it('#middlewareWrapper', () => {
    let result = null;
    const middleware = (req, res, next) => setTimeout(() => {
      result = 'success';
      next('error');
    }, 2);

    return promisesHelper.middlewareWrapper(middleware)(null, null)
      .catch(reason => {
        assert.equal(result, 'success');
        assert.equal(reason, 'error');
      });
  });
});

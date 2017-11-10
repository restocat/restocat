/* eslint-env node, mocha */

const assert = require('assert');
const promisesHelper = require('../../../lib/helpers/promises');

/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/helpers/promises', () => {
  it('#middlewareWrapper', () => {
    let result = null;

    const $context = {
      request: {foo: 'bar'},
      response: {}
    };

    const middleware = (req, res, next) => setTimeout(() => {
      assert.strictEqual(req.foo, 'bar');
      result = 'success';
      next('error');
    }, 2);

    return promisesHelper.middlewareWrapper(middleware)($context)
      .catch(reason => {
        assert.equal(result, 'success');
        assert.equal(reason, 'error');
      });
  });
});

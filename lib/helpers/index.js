module.exports = {
  promises: require('./promises'),
  requireHelper: require('./requireHelper'),

  uuid() {
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }
};

/**
 * For generation parts of uuid v4
 *
 * @returns {String} Part for UUID
 */
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

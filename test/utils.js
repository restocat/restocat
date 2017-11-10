const testUtils = {
  wait: milliseconds => new Promise(fulfill => setTimeout(() => fulfill(), milliseconds))
};

module.exports = testUtils;

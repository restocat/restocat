'use strict';

const fs = require('fs');

const testUtils = {
	wait: milliseconds => new Promise(fulfill => setTimeout(() => fulfill(), milliseconds))
};

module.exports = testUtils;

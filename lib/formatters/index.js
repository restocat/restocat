'use strict';

module.exports = {
  'application/json; q=0.3': require('./json'),
  'text/plain; q=0.2': require('./text'),
  'application/octet-stream; q=0.1': require('./binary')
};

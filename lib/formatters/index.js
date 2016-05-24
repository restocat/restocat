'use strict';

module.exports = {
  'application/json; q=0.4': require('./json'),
  'text/plain; q=0.3': require('./text'),
  'application/octet-stream; q=0.2': require('./binary')
};

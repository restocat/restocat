'use strict';

const events = require('events');

class UniversalMock extends events.EventEmitter {
  constructor(methodNames) {
    super();
    this.setMaxListeners(0);

    methodNames.forEach(name => {
      this[name] = function(...args) {
        this.emit(name, args);
        return Promise.resolve();
      };
    });
  }

  decorateMethod(name, method) {
    const old = this[name];
    if (typeof (old) !== 'function') {
      return;
    }
    this[name] = function(...args) {
      old.apply(this, args);
      return method.apply(this, args);
    };
  }
}

module.exports = UniversalMock;

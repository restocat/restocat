const events = require('events');
const testUtils = require('../../utils');

class CollectionsLoader extends events.EventEmitter {
  constructor(components) {
    super();
    this._toLoad = components;
  }

  load() {
    return testUtils.wait(100).then(() => {
      this._loaded = this._toLoad;
      return this._loaded;
    });
  }

  getCollectionByName(name) {
    return this._loaded[name];
  }
}

module.exports = CollectionsLoader;

module.exports = {
  Index: {
    constructor: class Index {
      list() {}
    },
    name: 'Index',
    properties: {
      logic: 'index.js',
      endpointsDefault: false,
      endpoints: {
        'get /': 'list'
      }
    }
  },
  Foo: {
    constructor: class Foo {
      list() {}
      one() {}
      update() {}
      create() {}
      delete() {}
    },
    name: 'Foo',
    properties: {
      logic: 'index.js'
    }
  },
  Bar: {
    constructor: class Bar {
      list() {}
      one() {}
    },
    name: 'Bar',
    properties: {
      logic: 'index.js',
      endpoints: {
        'put /:id': false,
        'post /': false,
        'delete /:id': false
      }
    }
  }
};

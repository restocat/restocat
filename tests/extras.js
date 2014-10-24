/**
 * @fileOverview Description file.
 * @author <a href="mailto:ma.chetverikov@gmail.com">Maksim Chetverikov</a>
 */

var _ = require('lodash')
  , async = require('async')
  , mongoose = require('mongoose')
  , assert = require('assert')
  , ext;

module.exports = ext = function () {
  var conn = mongoose.createConnection('mongodb://localhost/substance');

  conn.on('error', function (err) {
    assert.ok(err);
  });

  return conn;
};

_.extend( module.exports, {
  regexp: {
    token: new RegExp('^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$'),
    id: new RegExp("^[0-9a-fA-F]{24}$")
  },

  clearDatabase: function( done ){
    var db = ext();
    db.once('open', function () {
      // drop the default test database
      db.db.dropDatabase(function (err) {
        done();
      });
    });
  },

  closeMongoose: function( done ){
    mongoose.disconnect(done);
  }
});

before(function( done ){
  console.log('открываем');
  async.series( [ ext.clearDatabase ], done );
});

after(function( done ){
  console.log('закрываем');
  async.series( [ ext.closeMongoose ], done );
});
/**
 * @fileOverview Description file.
 */

var should = require('should')
  , assert = require('assert')
  , request = require('supertest')
  , validator = require('express-validator').validator
  , substance = require('./../')
  , db = require('./extras.js')
  , app = substance()
  , Error = require('./../lib/error');

app.resource('user', {
  name: { type: String, isRequired: true },
  password: String,
  roles: [ String ]
});

app.use(Error.errorHandler);

describe('Resources', function() {
  before(function( done ){
    db();
    done();
  });

  it('create', function(done) {
    request(app)
      .post('/users')
      .send({
        password: 123
      })
      .expect(201, function(err, res) {
        if (err) {
          console.log(res.text);
          throw err;
        }

        res.body.result._id.should.match(db.regexp.id);
        res.body.result.password.should.equal('123');

        done();
      });
  });

  it('list', function(done) {
    request(app)
      .get('/users')
      .expect(200, function(err, res) {
        if (err) {
          console.log(res.text);
          throw err;
        }

        res.body.result[0]._id.should.match(db.regexp.id);
        res.body.result[0].password.should.equal('123');

        done();
      });
  });

  it('default meta in list', function(done) {
    request(app)
      .get('/users')
      .expect(200, function(err, res) {
        if (err) {
          console.log(res.text);
          throw err;
        }

        res.body.meta.count.should.equal(1);
        res.body.meta.total.should.equal(1);
        res.body.meta.skip.should.equal(0);
        res.body.meta.limit.should.equal(25);

        done();
      });
  });

  it('check content type', function(done) {
    request(app)
      .post('/users')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(412, function(err, res) {
        if (err) {
          console.log(res.text);
          throw err;
        }

        done();
      });
  });

  it('validate query params', function(done) {
    request(app)
      .get('/users')
      .query({
        populate: [],
        limit: 3000
      })
      .expect(400, function(err, res) {
        if (err) {
          console.log(res.text);
          throw err;
        }

        res.body.error.errors.should.have.property('limit');

        done();
      });
  });

  it('check content type', function(done) {
    request(app)
      .post('/users')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(412, function(err, res) {
        if (err) {
          console.log(res.text);
          throw err;
        }

        done();
      });
  });
});
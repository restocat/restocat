var Error = require('./error.js')
  , notAllowed = function () {
    return arguments[arguments.length - 1](new Error.NotAllowed);
  };

/**
 * Методы
 *
 * TODO: Знаешь что? Не забудь про mime type check
 */
module.exports = {
  /**
   * Collection: create, list
   */

  // list
  'get /': function (req, res, done) {
    var query = req.query;

    this.model.find(query.filters, query.fields, {
      limit: query.limit,
      skip: query.skip,
      sort: query.sort
    }).populate(query.populate).exec(done);
  },

  // create
  'post /': function (req, res, done) {
    var body = req.body;

    this.model.create(body, done)
  },

  // не поддерживаемые методы
  'all /': notAllowed,




  /**
   * Individual: read, update, delete
   */

  // read
  'get /:id': function (req, res, done) {
    var id = req.params.id
      , query = req.query;

    this.model.findById(id, query.fields).populate(query.populate).exec(function (err, doc) {
      if (err || !doc) return done(err || new Error.NotFound('Document #' + id + ' not found'));

      done(null, doc);
    });
  },

  // update
  'put /:id': function (req, res, done) {
    var id = req.params.id
      , body = req.body;

    this.model.findById(id, function (err, doc) {
      if (err || !doc) return done(err || new Error.NotFound('Document #' + id + ' not found'));

      doc.set(body);
      doc.save(done);
    });
  },

  // delete
  'delete /:id': function (req, res, done) {
    var id = req.params.id;

    this.model.remove({_id: id}, done);
  },

  /**
   * JSON Patch ( Operation Transformation )
   *
   * TODO:!!!
   */
  'all /:id': notAllowed
};
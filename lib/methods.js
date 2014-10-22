var Error = require('./error.js');

/**
 * Методы
 *
 * TODO: Знаешь что? Не забудь про mime type check
 */
module.exports = function( model ){
  var methods = {
        notAllowed: function () {
          return arguments[arguments.length - 1](new Error.NotAllowed);
        }
      };

    /**
     * Работа с коллекцией ресурсов
     */
    methods.collection = {

      /**
       * Получение списка ресурсов
       */
      get: function( req, res, done ){
        var query = req.query;

        model.find(query.filters, query.fields, {
          limit: query.limit,
          skip: query.skip,
          sort: query.sort
        }).populate( query.populate ).exec( done );
      },

      /**
       * Создание ресурса в коллекции
       *
       * После создание обратится в бд
       * что бы выбрать в соответствии с
       * указанными требованиями
       *
       */
      post: function( req, res, done ){
        var body = req.body;

        model.create( body, done )
      },

      // не поддерживаемые методы
      put: methods.notAllowed,
      patch: methods.notAllowed,
      delete: methods.notAllowed
    };

    /**
     * Работа с ресурсами
     *
     * TODO: Sub doc route need
     */
    methods.individual = {

      /**
       * Получение ресурса
       */
      get: function( req, res, done ){
        var id = req.params.id
          , query = req.query;

        model.findById( id, query.fields ).populate( query.populate ).exec(done);
      },

      /**
       * Обновление ресурса
       */
      put: function( req, res, done ){
        var id = req.params.id
          , body = req.body;

        model.findById( id, function(err, doc){
          if(err || !doc) return done(err || new Error.NotFound('Document #' + id + ' not found'));

          doc.set(body);
          doc.save(done);
        });
      },

      /**
       * JSON Patch ( Operation Transformation )
       *
       * TODO:!!!
       */
      patch: methods.notAllowed,

      /**
       * Удаление ресурса
       */
      delete: function( req, res, done ){
        var id = req.params.id;

        model.remove( {_id: id}, done);
      },

      // не поддерживаемые методы
      post: methods.notAllowed
    };

  return methods;
};
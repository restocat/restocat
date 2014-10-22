var Error = require('./error.js')
  , _ = require('lodash')
  , validator = require('express-validator').validator
  , isBoolean = function(value){return (value == 'true' || value == 'false' || value === true || value === false);}
  , parseValues = function( obj ){
      _.forEach(obj, function(item, key){
        var val = _.isString(item)? item.toLowerCase(): item;

        switch( true ){
          case _.isObject( val ) || _.isArray( val ):
            parseValues( val );
            break;
          case validator.isNumeric( val ):
            obj[key] = Number( val );
            break;
          case isBoolean( val ):
            obj[key] = validator.toBoolean( val );
            break;
          case validator.isNull( val ):
            obj[key] = null;
            break;
          default:
        }
      });
    }
  , checkData = function( data ){
      if(_.isArray( data )) {
        _.each(data, function (item, key) {
          data[key] = checkData(item);
        });

        return data;
      }

      if(!_.isObject( data ))
        return data;

      if(_.has(data, '_id'))
        delete data._id;

      if(_.has(data, 'id'))
        delete data.id;

      if(_.has(data, 'created'))
        delete data.created;

      if(_.has(data, 'updated'))
        delete data.updated;

      if(_.has(data, 'author'))
        delete data.author;

      if(_.has(data, 'editor'))
        delete data.editor;

      return data
    };

/**
 * Методы
 *
 * TODO: Знаешь что? Не забудь про mime type check
 */
module.exports = function( model ){

  return {
    removeFields: function ( req, res, next ) {
      if (req.query && Object.keys(req.query).length > 0)
        checkData(req.query);

      if (req.body && Object.keys(req.body).length > 0)
        checkData(req.body);

      next();
    },

    parseValuesByType: function ( req, res, next ) {
      if (req.query && Object.keys(req.query).length > 0)
        parseValues(req.query);

      if (req.body && Object.keys(req.body).length > 0)
        parseValues(req.body);

      next();
    },

    checkContentType: function( req, res, next ){
      var types = ['application/vnd.api+json', 'application/json'];

      // TODO: Создать соответствующий объект ошибок
      if(!~types.indexOf(req.get('content-type').split(';').shift())){
        var error = new Error( 'Request header "Content-Type" must be one of: ' + ['application/vnd.api+json', 'application/json'].join(', ') );

        error.name = 'PreconditionError';
        error.status = 412;
        error.code = 412000;

        next( error );
      }else{
        next();
      }
    },

    validateAndSetDefaultMongooseParams: function (req, res, next) {
      function defaults(name, value) {
        if (!req.query[name]) {
          return req.query[name] = value;
        }
      }

      // Validate
      req.checkQuery('fields', 'Invalid fields. Param must be is object or string').optional().isObjectOrString();
      req.checkQuery('filters', 'Invalid filters. Param must be is object or string').optional().isObjectOrString();
      req.checkQuery('limit', 'Invalid limit. Param must be is number and more than 1 and less than 500').optional().isNumeric().gte(1).lte(500);
      req.checkQuery('skip', 'Invalid skip. Param must be is number').optional().isNumeric();
      req.checkQuery('sort', 'Invalid sort. Param must be is object or string').optional().isObjectOrString();
      req.checkQuery('populate', 'Invalid populate. Param must be is object or string').optional().isObjectOrString();
      req.checkQuery('transform', 'Invalid transform. Param must be is boolean').optional().isBoolean();

      var errors = req.validationErrors();
      if (errors) {
        var error = new Error.Request();

        error.errors = _.indexBy(errors, 'param');

        return next(error);
      }

      // Set default values
      defaults('fields', '');
      defaults('filters', {});
      defaults('limit', 25);
      defaults('skip', 0);
      defaults('sort', '');
      defaults('populate', '');
      defaults('transform', true);

      next();
    },

    toResult: function (req, res, result, next) {
      result = {'result': result};

      next(null, result);
    },

    addMetaCount: function (req, res, result, next) {
      result['meta'] = {
        count: (result.result && result.result.length) || 0,
        skip: req.query.skip,
        limit: req.query.limit
      };

      next(null, result);
    },

    addMetaTotal: function (req, res, result, next) {
      model.count(req.query.filters, function(err, total){
        if(err) return next(err);

        result.meta.total = total;

        next(null, result);
      });
    },

    addLinks: function (req, res, result, next){

    }
  }
};
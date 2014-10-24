/**
 * @fileOverview Description file.
 * @author <a href="mailto:ma.chetverikov@gmail.com">Maksim Chetverikov</a>
 */

var _ = require('lodash')
  , async = require('async')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , inflect = require('i')()
  , Router = require('express').Router
  , defaultMethods = require('./methods')
  , hooks = require('./hooks')
  , debug = require('debug')('substance:resource');


var Resource = function( name, schema, options ){
  this.setOptions( options );

  this._name = name;
  this._collection = this.options.inflect ? inflect.pluralize(this._name) : this._name;

  this._setModel( name, schema );
  this._setRouter();
  
  this._setDefaultMethods();
  this._setDefaultHooks();

  debug( 'added "' + this._name + '" resources and mount on ' + this._routes.collection );
};

/**
 * Опции по-умолчанию
 *
 * @private
 */
Resource.prototype._defaults = {
  inflect: true
};

/**
 * Установка опций
 *
 * @param options
 */
Resource.prototype.setOptions = function( options ){
  // Initialize options.
  this.options = _.isObject(options)? _.cloneDeep(options) : {};

  _.defaults(this.options, this._defaults);
};

Resource.prototype._setModel = function( name, schema ){

  // If passed model or not schema
  if (_.has(schema, 'modelName') && schema.modelName) {
    return this._model = schema;
  }

  if (mongoose.modelSchemas[name]) {
    throw new mongoose.Error.OverwriteModelError(name);
  }

  if (_.isPlainObject(schema)) {
    schema = new Schema(schema, this.options);
  }

  return this._model = mongoose.model( name, schema, this._collection );
};

Resource.prototype._setRouter = function(){
  this._routes = {
    collection: [this.options.namespace, this._collection].join('/'),
    individual: [this.options.namespace, this._collection, ':id'].join('/')
  };
  
  return this._router = Router( this.options );
};

Resource.prototype._getHooks = function( stage, uri, method_name ){
  var resource = this
    , path = [method_name, uri].join(' ').trim().toLowerCase()
    , hooks = [];

  if(resource._hooks[ stage + 'All' ]){
    hooks = hooks.concat( resource._hooks[ stage + 'All' ] );
  }

  if(resource._hooks[stage] &&
     resource._hooks[stage][path]){
    hooks = hooks.concat( resource._hooks[stage][path] );
  }

  return hooks;
};

Resource.prototype._setDefaultHooks = function(){
  var defaultHooks = hooks( this._model );

  this._hooks = {
    beforeAll: [],
    afterAll: [],
    before: {},
    after: {}
  };

  this.beforeAll( defaultHooks.parseValuesByType );
  this.beforeAll( defaultHooks.validateAndSetDefaultMongooseParams );

  this.before( 'create', defaultHooks.checkContentType );
  this.before( 'create', defaultHooks.removeFields );

  this.before( 'update', defaultHooks.checkContentType );
  this.before( 'update', defaultHooks.removeFields );

  this.after( 'list', defaultHooks.addMetaCount );
  this.after( 'list', defaultHooks.addMetaTotal );

  this.afterAll( defaultHooks.toResult );
};

Resource.prototype._setDefaultMethods = function(){
  var resource = this
    , methods = defaultMethods( this._model )
    , router = this._router
    , routes = this._routes;

  _.each( routes, function( path, type ){
    _.each( methods[type], function( func, method ){

      router[method]( path, function( req, res, next ){
        debug(type + ':' + method + ':' + path);

        // call before hooks
        resource._callHooks(req, res, 'before', path, method, function( err ){
          if(err) return next(err);

          func(req, res, function( err, result ){
            if(err) return next(err);

            // call after hooks
            resource._callHooks(req, res, result, 'after', path, method, function( err, result ){
              if(err) return next(err);

              res.status(method == 'post'? 201: 200).send( result );
            });
          })
        });

      });
    });
  });
};

Resource.prototype._callHooks = function( req, res, result, stage, path, method, done ){

  if(result == 'before'){
    done = method;
    method = path;
    path = stage;
    stage = result;
    result = undefined;
  }

  async.eachSeries(this._getHooks( stage, path, method ), function( hook, next ){
    if( stage == 'before' ) {
      hook( req, res, next );
    } else {
      hook( req, res, result, function(err, tmp){
        result = tmp;
        next(err, tmp);
      })
    }
  }, function(err){
    debug(method + ':' + path + ' - ' + stage + ' hooks is done' );

    done(err, result)
  });
};

Resource.prototype._getPathForAction = function( action ){
  var path = action.trim().toLowerCase();

  switch( path ){
    case 'create':
      path = 'post ' + this._routes.collection;
      break;
    case 'list':
      path = 'get ' + this._routes.collection;
      break;
    case 'update':
      path = 'put ' + this._routes.individual;
      break;
    case 'delete':
      path = 'delete ' + this._routes.individual;
      break;
    case 'read':
      path = 'get ' + this._routes.individual;
      break;
    default:
      path = action;
      break;
  }

  return path.toLowerCase();
};

Resource.prototype._addHook = function( stage, path, hook ){
  if( !this._hooks[stage] ){
    this._hooks[stage] = {};
  }

  if( !this._hooks[stage][path] ){
    this._hooks[stage][path] = [];
  }

  this._hooks[stage][path].push(hook);

  debug('added hook ' + [stage, path].join(' '));
};

Resource.prototype.before = function( action, hook ){
  this._addHook( 'before', this._getPathForAction(action), hook );

  return this;
};

Resource.prototype.after = function( action, hook ){
  this._addHook( 'after', this._getPathForAction(action), hook );

  return this;
};

Resource.prototype.beforeAll = function( hook ){
  this._hooks.beforeAll.push( hook );

  return this;
};

Resource.prototype.afterAll = function( hook ){
  this._hooks.afterAll.push( hook );

  return this;
};

module.exports = Resource;
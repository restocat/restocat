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

  this.options.collection = this.options.inflect ? inflect.pluralize(name) : name;

  this._setModel( name, schema );

  this._setRouter();

  this._setDefaultMethods();

  this._setDefaultHooks();
};

/**
 * Опции по-умолчанию
 *
 * @private
 */
Resource.prototype._defaults = {
  collection: 'default',
  inflect: true
};

/**
 * Store of hooks
 *
 * @type {Array}
 */
Resource.prototype._hooks = {
  beforeAll: [],
  afterAll: [],
  before: {},
  after: {}
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
  if (mongoose.modelSchemas[name]) {
    throw new mongoose.Error.OverwriteModelError(name);
  }

  if (_.isPlainObject(schema)) {
    schema = new Schema(schema, this.options);
  }

  return this._model = mongoose.model( name, schema, this.options.collection );
};

Resource.prototype._setRouter = function(){
  return this._router = Router( this.options );
};

Resource.prototype.getHooks = function( stage, path, method_name ){
  var resource = this
    , hooks = [];

  if(resource._hooks[ stage + 'All' ]){
    hooks = hooks.concat( resource._hooks[ stage + 'All' ] );
  }

  if(resource._hooks[stage] &&
     resource._hooks[stage][path] &&
     resource._hooks[stage][path][method_name]){

    hooks = hooks.concat( resource._hooks[stage][path][method_name] );
  }

  return hooks;
};

Resource.prototype._setDefaultHooks = function(){
  var defaultHooks = hooks( this._model )
    , routes = {
    collection: [this.options.namespace, this.options.collection].join('/'),
    individual: [this.options.namespace, this.options.collection, ':id'].join('/')
  };

  this._hooks.beforeAll = [
    defaultHooks.parseValuesByType,
    defaultHooks.validateAndSetDefaultMongooseParams
  ];

  this._hooks.before[routes.collection] = {post: [defaultHooks.checkContentType, defaultHooks.removeFields] };
  this._hooks.before[routes.individual] = {put: [defaultHooks.checkContentType, defaultHooks.removeFields] };

  this._hooks.after[routes.collection] = {get: [
    defaultHooks.addMetaCount,
    defaultHooks.addMetaTotal
  ]};

  this._hooks.afterAll = [
    defaultHooks.toResult
  ]
};

Resource.prototype._setDefaultMethods = function(){
  var resource = this
    , methods = defaultMethods( this._model )
    , router = this._router
    , routes = {
      collection: [this.options.namespace, this.options.collection].join('/'),
      individual: [this.options.namespace, this.options.collection, ':id'].join('/')
    };

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

  async.eachSeries(this.getHooks( stage, path, method ), function( hook, done_hook ){
    if( stage == 'before' ) {
      hook( req, res, done_hook );
    } else {
      hook( req, res, result, function(err, tmp){
        result = tmp;
        done_hook(err, tmp);
      })
    }
  }, function(err){
    debug(method + ':' + path + ' - ' + stage + ' hooks is done' );

    done(err, result)
  });
};

Resource.prototype.before = function(){};
Resource.prototype.after = function(){};

module.exports = Resource;
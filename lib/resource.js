/**
 * @fileOverview Description file.
 * @author <a href="mailto:ma.chetverikov@gmail.com">Maksim Chetverikov</a>
 */

'use strict';

var _ = require('lodash')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , inflect = require('i')()
  , Router = require('express').Router
  , debug = require('debug')('substance:resource')
  , stages = 'before after beforeAll afterAll'
  , actions = 'create read update delete list'
  , defaults = require('substancejs-defaults')
  , methods = require('methods')
  , vow = require('vow')
  , proto;

proto = module.exports = function( name, schema, options ){
  function Resource(req, res, next) {
    Resource.handle(req, res, next);
  }

  // mixin Router class functions
  _.assign( Resource, Router );
  _.assign( Resource, proto );

  Resource.setOptions( options );

  // Init
  Resource._routerInit();
  Resource._resourceInit( name, schema );

  var defFunc = Resource.options.defaults || defaults;
  defFunc( Resource );

  return Resource;
};

proto._defaults = {
  inflect: true,
  namespace: undefined
};

proto._routerInit = function(){
  this.params = {};
  this._params = [];
  this.caseSensitive = this.options.caseSensitive;
  this.mergeParams = this.options.mergeParams;
  this.strict = this.options.strict;
  this.stack = [];
};

proto._resourceInit = function( name, schema ){
  this.collection = this.options.inflect ? inflect.pluralize(name) : name;
  this._name = name;
  this.schema = schema;

  this.routes = {
    collection: '/',
    individual: '/:id'
  };

  this.setModel( schema );

  this.methods = {};
  this.hooks = {};
};

proto.setModel = function(){

  // If passed model or not schema
  if (_.has(this.schema, 'modelName') && this.schema.modelName) {
    return this.model = this.schema;
  }

  if (mongoose.modelSchemas[ this._name ]) {
    throw new mongoose.Error.OverwriteModelError( this._name );
  }

  if (_.isPlainObject(this.schema)) {
    this.schema = new Schema(this.schema, this.options);
  }

  return this.model = mongoose.model( this._name, this.schema, this.collection );
};

proto.setOptions = function( options ){
  // Initialize options.
  this.options = _.isObject(options)? _.cloneDeep(options) : {};

  _.defaults(this.options, this._defaults);
};

proto.getMountPath = function(){
  var namespace = this.options.namespace;
  namespace = (namespace)? '/' + namespace: undefined;

  return [namespace, this.collection].join('/');
};

proto.method = function( path, callback ){
  var resource = this
    , part = path.split(' ')
    , http = '_' + part[0]
    , uri = part[1];

  this[http](uri, function(req, res, next){
    resource._callHooks('before', path, req, res)
      .then(function(){
        var def = vow.defer();

        callback.call(resource, req, res, function( err, result ){
          err? def.reject(err): def.resolve(result);
        });

        return def.promise();
      })
      .then(function( result ){
        return resource._callHooks('after', path, req, res, result);
      })
      .done(function(result){
        res.status((path.indexOf('post') !== -1)? 201: 200).send( result );
      }, next);
  });

  debug( 'method `' + path + '` added');

  return this;
};

proto.hook = function(){
  var resource = this
    , stage = arguments[0]
    , paths = []
    , callbacks = []
    , key;

  _.each( Array.prototype.slice.call(arguments, 1), function( arg ){
    if(_.isString( arg ) || arg === undefined)
      paths.push(arg);

    if(_.isFunction( arg ))
      callbacks.push(arg);
  });

  if(paths.length < 1 && stage.indexOf('All') > -1){
    paths.push(undefined);
  }

  _.each( paths, function( path ){
    if(path) {
      path = path.trim().toLowerCase();

      if (actions.indexOf(path) != -1) {
        path = resource._getPathForAction(path);
      }
    }

    key = [stage, path].join(' ').trim().toLowerCase();

    if(!resource.hooks[ key ]){
      resource.hooks[key] = [];
    }

    resource.hooks[key].push.apply(resource.hooks[key], callbacks);

    debug( 'hooks for `' + key + '` added');
  });
};

proto._callHooks = function( stage, path, req, res, result ){
  var resource = this
    , hooks = []
    , key
    , keyAll;

  key = [stage, path].join(' ').trim().toLowerCase();
  keyAll = stage + 'All'.trim().toLowerCase();

  if( resource.hooks[ keyAll ] )
    hooks = hooks.concat(resource.hooks[ keyAll ]);

  if( resource.hooks[ key ] )
    hooks = hooks.concat(resource.hooks[ key ]);

  return resource._callSeriesCallbacks(hooks, stage, req, res, result);
};

proto._callSeriesCallbacks = function( callbacks, stage, req, res, result ){
  var def = vow.defer()
    , resource = this
    , promise;

  promise = callbacks.reduce(function( previous, current ){
    var context = {
      callback: current,
      req: req,
      res: res,
      result: result,
      stage: stage,
      resource: resource };

    return previous.then( resource._iteratorCallback, context );
  }, def.promise());

  def.resolve(result);

  return promise;
};

proto._iteratorCallback = function(previous_result){
  var def = vow.defer()
    , args = [this.req, this.res];

  if(this.stage === 'after')
    args.push(previous_result);

  args.push(function(err, result){
    err? def.reject(err): def.resolve(result);
  });

  this.callback.apply( this.resource, args);

  return def.promise();
};

proto._getPathForAction = function( action ){
  var path = action.trim().toLowerCase();

  switch( path ){
    case 'create':
      path = 'post ' + this.routes.collection;
      break;
    case 'list':
      path = 'get ' + this.routes.collection;
      break;
    case 'update':
      path = 'put ' + this.routes.individual;
      break;
    case 'delete':
      path = 'delete ' + this.routes.individual;
      break;
    case 'read':
      path = 'get ' + this.routes.individual;
      break;
    default:
      path = action;
      break;
  }

  return path.toLowerCase();
};

proto._findRoute = function( method, uri ){
  var index = -1;

  _.each(this.stack, function( layer, i ){
    if( layer.route.path == uri && layer.route.methods[method] ){
      index = i;
      return false;
    }
  });

  return index;
};

proto.clear = function( stage, action ){
  var resource = this
    , pathForSearch = '';

  stage = stage.toLowerCase();
  if( stage.indexOf('all') === -1 ){
    pathForSearch = ['^', stage, '\\s'].join('');
  }else{
    pathForSearch = ['^', stage].join('');
  }

  if(_.isString(action))
    pathForSearch = [pathForSearch, resource._getPathForAction( action ).replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1")].join('');

  var paths = _.keys( resource.hooks )
    , regx = new RegExp( pathForSearch, 'i' );

  _.each( paths, function( path ){
    if( regx.test(path) ){
      delete resource.hooks[ path ];

      debug( 'hook "' + path + '" removed ' );
    }
  });

  return resource;
};

// create Router#VERB functions
methods.concat('all').forEach(function(method){
  proto['_' + method] = function(path){

    var route = this.route(path);
    route[method].apply(route, Array.prototype.slice.call(arguments, 1));

    // Replace already exist route
    var already = this._findRoute( method, path );
    if( already > -1 && already < this.stack.length - 1 ){
      var last_layer = this.stack[this.stack.length - 1];
      if( last_layer && last_layer.route.path == path && last_layer.route.methods[method] ){

        this.stack.pop();
        this.stack.splice( already, 1, last_layer );

        debug( "Replace " + [method, path].join(' ') );
      }
    }

    return this;
  };
});


/**
 * hook methods
 */
_.each(stages.split(' '), function( stage ){
  proto[ stage ] = function( path, callback ){
    this.hook.apply( this, [stage].concat(Array.prototype.slice.call(arguments,0)));

    return this;
  };
});

_.each(actions.split(' '), function( action ){
  proto[ action ] = function( callback ){
    var path = this._getPathForAction( action );

    this.method( path, callback );

    return this;
  }
});
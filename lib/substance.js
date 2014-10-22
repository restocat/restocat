/**
 * @fileOverview Description file.
 * @author <a href="mailto:ma.chetverikov@gmail.com">Maksim Chetverikov</a>
 */

var express = require('express')
  , Error = require('./error')
  , EventEmitter = require('events').EventEmitter
  , bodyParser = require('body-parser')
  , _ = require('lodash')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , debug = require('debug')('substance')
  , validator = require('./validator')
  , Resource = require('./resource');

/*
 * The Substance object.
 */
function Substance () {
  return this._init.apply(this, arguments);
}

/**
 * Опции которые были переданы при инициализации
 *
 * ### Database setup
 * - `mongoose.uri`: MongoDB URIs
 * - `mongoose.options`: MongoDB Options
 *
 * ### Substance setup
 * - `inflect`: Автоматическое преобразование слов единственного числа в множественное и обратно. Default: `true`.
 * - `cors`: флаг разрешения или запрета Cross Origin Resource Sharing (CORS), или объект следующих значений: `headers` (Array), `methods` (Array), `origins` (Array), and `credentials` (Boolean). Default: true.
 * - `environment`: Default: `process.env.NODE_ENV`.
 */
Substance.prototype.options = {};

/**
 * Настройки по умолчанию
 *
 * @api private
 */
Substance.prototype._defaults = {
  mongoose: {
    uri: "mongodb://localhost/substance",
    options: {}
  },

  inflect: true,
  cors: true,
  environment: process.env.NODE_ENV
};

/**
 * Instance of `express`.
 */
Substance.prototype.express = {};

/**
 * Store of Resources by name
 *
 * @api private
 */
Substance.prototype._resources = {};

/**
 * Инициализация mongoose
 *
 * @returns {{}|*}
 * @private
 */
Substance.prototype._mongooseInit = function(){
  mongoose.connect(this.options.mongoose.uri, this.options.mongoose.options);
  mongoose.connection.once('open', function(){
    debug('Mongoose is connect');
  })
};

/**
 * Инициализация express и подмешивание своих методов в express
 *
 * @returns {{}|*}
 * @private
 */
Substance.prototype._expressInit = function(){
  var options = this.options
    , app = function(req, res, next) {
        app.handle(req, res, next);
      };

  _.assign(app, express.application);
  _.assign(app, EventEmitter.prototype);
  _.assign(app, {
    _resources: [],
    resource: function( name, schema, options ){

      if(arguments.length > 1){
        this._resources[ name ] = new Resource( name, schema, options );
        this.use( this._resources[ name ]._router  );
      }

      return this._resources[ name ];
    },
    mongoose: mongoose,
    Error: Error
  });

  app.request = { __proto__: express.request, app: app };
  app.response = { __proto__: express.response, app: app };

  app.init();

  if (_.isBoolean(options.cors) || _.isObject(options.cors)) {
    app.use(allowCrossDomain(options.cors));
  }

  app.disable('x-powered-by');
  app.use(bodyParser.json());
  app.use(validator);

  debug('was initialized');
  return app;
};

/**
 * Инициализация
 *
 * @api private
 * @param {Object} options
 */
Substance.prototype._init = function ( options ) {
  this.setOptions( options );
  this._mongooseInit();
  return this._expressInit();
};

/**
 * Установка опций
 *
 * @param options
 */
Substance.prototype.setOptions = function( options ){
  // Initialize options.
  options = _.isObject(options)? options : {};
  this.options = _.cloneDeep(options);

  _.defaults(this.options, this._defaults);
};


// Default Cross-Origin Resource Sharing setup.
function allowCrossDomain (cors) {

  var headers = cors.headers || ['Accept', 'Content-Type', 'Authorization', 'X-Requested-With'];
  var methods = cors.methods || ['GET', 'PUT', 'POST', 'PATCH', 'DELETE'];
  var origins = cors.origins || '*';
  var credentials = cors.credentials || true;

  return function (req, res, next) {
    var origin = req.get('Origin');

    if (!origin) {
      return next();
    }

    if (origins !== '*') {
      if (origins.indexOf(origin)) {
        origins = origin;
      } else {
        next();
      }
    }

    res.header('Access-Control-Allow-Origin', origins);
    res.header('Access-Control-Allow-Headers', headers.join(', '));
    res.header('Access-Control-Allow-Methods', methods.join(', '));
    res.header('Access-Control-Allow-Credentials', credentials.toString());

    // intercept OPTIONS method
    if (req.method === 'OPTIONS') {
      res.send(200);
    } else {
      next();
    }
  };
}

/*!
 * Create instance of Substance.
 *
 * @param {Object} options
 */
function create (options) {
  return new Substance(options);
}

// Expose create method
exports = module.exports = create;

// Expose Express framework
exports.express = express;

// Expose RSVP promise library
//exports.RSVP = RSVP;

// Expose Lodash
exports._ = _;

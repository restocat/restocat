var validator = require('express-validator')
  , _ = require('lodash');

module.exports = validator({
  customValidators: {
    isArray: function( value ){
      return _.isArray( value );
    },
    isObject: function( value ){
      return _.isObject( value );
    },
    isObjectOrString: function( value ){
      return _.isObject( value ) || _.isString( value );
    },
    isBoolean: function( value ){
      return (value == 'true' || value == 'false' || value === true || value === false);
    },
    gte: function( value, num ){
      return value >= num;
    },
    lte: function( value, num ){
      return value <= num;
    },
    has: function( value ){
      return !!value;
    }
  }
});
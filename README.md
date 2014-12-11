Substance.js
=========

Substance.js is a framework for quickly create RESTful APIs with Express.js and Mongoose.js

## Usage

> Mongoose is required. In terminal: `npm install mongoose --save`

### Defining resource


```javascript
  
  var substance = require('substancejs')
    , config = require('./config.json')
    , modelReview = require('./modelReview')
    , Schema = require('mongoose').Schema
    , app = substance({
      mongoose:{
        uri: config.uri,
        options: config.options
      }
    });
  
  app.resource( 
    'user',           // resource name
    {                 // resource data schema
      username: String,
      email: String
    },
    {
      defaults: function( resource ){ ... },
      namespace: undefined  // add base for mount path
    }
  );
  
  app.resource('place', new Schema({ /* ••• */ }));
  
  app.resource('review', modelReview);
  
  app.resource('place')
      .beforeAll( /* passport.js auth */ )
      .before('create', function( req, res, next ){
          req.body.author = req.body.editor = req.user;
          
          next();
      })
      .before('update', function( req, res, next ){
          req.body.editor = req.user;
          
          next();
      })
      .after('list', function( req, res, result, next ){
        this; // context == Resource
        this.model // == mongoose.model('place');
      
        this.model.count(req.query.filters, function(err, countPlaces){
          result.meta.total = countPlaces;
          next(null, result);
        });
      })
  
  
  app.listen(3000, function(){
    console.log('Substance listening at http://localhost:3000');
  });
  
```

Done! Now you have the following routes:


| HTTP	| Address |	Notes |
| -------- | -------- | -------- |
| GET  | /users | Get a collection of resources, accepts query: filters, fields, sort, limit, skip, populate |
| POST | /users | Create a resource |
| GET  | /users/:id | Get a specific resource |
| PUT  | /users/:id | Update a resource |
| DELETE | /users/:id | Delete a resource |

### Before and after transformation

If you need to validate the input data or to wrap up the output, then you can use transformers before and after.

> beforeAll and afterAll transformer will be called before other!

```javascript
  app.resource( 'user', schema, options )
        .before( 'list', function( req, res, next ){
            QueryPreparing(req.query);
            
            next();
        })
        .before( 'create', function( req, res, next ){
            ValidateBodyParams(req.body);
            
            if(req.validateErrors){
              next(req.validateErrors);
            }else{
              next();
            }
        })
        .afterAll(function( req, res, result, next ){
            next( null, { result: result, count: result.length });
        })
        
  // Multi
  
  app.resource( 'user' )
        .before( 'create', 'update', something_func  )
        .after('list', 'read', func_1, func_2 )
```

By default, in Substance has set the following transformers

| Stage | Action | Transformation |
| ----- | ------ | -------------- |
| beforeAll | --- | Parse input value by type (type conversion). Example 'true' --> true |
| beforeAll | --- | Validation the parameters that will be passed in  Mongoose Query |
| before | create | Check Content-Type header (only 'application/vnd.api+json' or 'application/json') |
| before | create | Remove unnecessary fields from req.body (_id, updated, created, author, editor) |
| before | update | Check Content-Type header (only 'application/vnd.api+json' or 'application/json') |
| before | update | Remove unnecessary fields from req.body (_id, updated, created, author, editor) |
| after | list | Add meta field and count (length of result) in meta field |
| after | list | Add total field in meta (total count of data by filters) |
| afterAll | --- | Wrap all result in result field |

## Override default method
You can override default method:

```javascript
  app.resource('another')
        .create( my_create_func ) // override create function. Args req, res, next
        .read( my_read_func )
        .list( my_list_func )
        .update( my_up_func )
```

## Custom method

```javascript
  app.resource('review')
        .method('post /:id/block', method_for_review) // now you have  POST /reviews/:id/block method
        .before('post /:id/block', before_block) // and hook for custom method
```

## Set global methods and hooks by default
If you want to set for all or for some resources their methods and hooks, you can set options 'defaults'.

```javascript
    var defaults = function( resource ){   
            resource.create( MyCreateFunc );
            resource.beforeAll( MyHookFunc ); 
        }
      , app = substance( { ..., defaults: defaults}) // for all resources
      
      // OR
      
      app.resource('Name', SchemaOrModel, { defaults: defaults }) // for current resource
```

## Clear hooks

```javascript
    app.resource('review').clear('before'); // remove all before hooks
    app.resource('review').clear('beforeall'); // remove all beforeall hooks
    app.resource('review').clear('before', 'create'); // remove all before create hooks
    app.resource('review').clear('before', 'put /reviews/:id/photos'); // remove all before custom method hooks
```

## Debug

Substance uses the [debug](https://github.com/visionmedia/debug) module internally to log information about route matches and application mode. To see this information, simply set the DEBUG environment variable to substance:* when launching your app and the debug information will appear on the console.

```
   DEBUG=substance* node app.js
```

Substance.js
=========

Substance.js is a framework for quickly create RESTful APIs with Express.js and Mongoose.js

## Usage

### Defining resource


```javascript
  
  var substance = require('substancejs')
    , app = substance();
  
  app.resource( 
    'user',           // resource name
    {                 // resource data schema
      username: String,
      email: String
    }
  );

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

## Debug

Substance uses the [debug](https://github.com/visionmedia/debug) module internally to log information about route matches and application mode. To see this information, simply set the DEBUG environment variable to substance:* when launching your app and the debug information will appear on the console.

```
   DEBUG=substance* node app.js
```
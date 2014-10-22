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

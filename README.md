Substance.js
=========

Substance.js is a framework for quickly create RESTful APIs with Express.js and Mongoose.js

## Usage

### Defining resource


```javascript
  
  var app = require('substancejs')();
  
  app.resource( 
    'user',           // resource name
    {                 // resource data schema
      username: String,
      email: String
    },
    {}                // options
  );
  
```

and request

```javascript
    
```

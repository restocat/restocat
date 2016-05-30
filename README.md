Restocat
========

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/restocat/restocat?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Travis CI](https://travis-ci.org/restocat/restocat.svg?branch=master)](https://travis-ci.org/restocat/restocat)
[![codecov](https://codecov.io/gh/restocat/restocat/coverage.svg)](https://codecov.io/gh/restocat/restocat)


Restocat is a framework for quickly create REST APIs

# TL;DR

Install [Restocat CLI](https://www.npmjs.com/package/restocat-cli) using following command:

```bash
npm install -g restocat-cli
```

Use Restocat CLI to create an empty project like this:

```bash
restocat init
```

# Collections

Each collection is declared as a directory with the collection.json file by default. When Restocat initializes the application it recursively searches for such directories starting with your project root, and then via first-level dependencies in the ./node_modules directory.

The collection.json file consists of following:

* name – the name of the collection (optional). By default, this is the name of the directory. Please keep in mind that a parameter's name in a route definition must satisfy the regular expression /^[\w-]+$/i
* logic – a relative path to the file that exports a class or a constructor function for the component's logic object (optional). By default, index.js will be used.
* endpointDefault – a relative path to the file that exports a class or a constructor function for the component's logic object (optional). By default - `true`
* endpoints – map of the relationship between the route and handler (optional). By default:

```javascript
{
    "get /": "list",
    "post /": "create",
    "get /:id": "one",
    "put /:id": "update",
    "delete /:id": "delete"
}
```

An example collection.json could look like this:

```javascript
{
    "name": "Entities",
    "description": "Some awesome and cool collection",
    "logic": "./Entities.js",
    "endpoints": {
      "delete /:id": false, // don't use this endpoint
      "put /:id": false,
      "post /": false,
      "get /sub-entities/": "subEntities", // custome endpoint
      "get /sub-entities/:id": "subEntity"
    }
}
```

# Context

Restocat sets as the property `$context` for every instance of each `collection`.

`$context` has at least the following properties and methods:

* `this.$context.request` - the current request (IncomingMessage)
* `this.$context.response` - the current response (ResponseServer)

* `this.$context.location` – the current [URI](https://github.com/catberry/catberry-uri) object that constains the current location.
* `this.$context.referrer` – the current [URI](https://github.com/catberry/catberry-uri) object that contains the current referrer.

* `this.$context.locator` – the [Service Locator](https://github.com/catberry/catberry-locator) of the application.
* `this.$context.forward('collection_name', 'handle_name')` – forwarding the current request to a other collection. This method is useful for creating a sub-collection flow 
* `this.$context.notFound()` - correct 404 response from the server

# Events

There are two ways of listening to a Restocat event:

* Subscribe on it using the Restocat application instance directly like this:

```javascript
const Restocat = require('restocat');
const restocat = new Restocat();

restocat.events.on('error', error => {
	// some action
});
```

* Subscribe on it using the `this.$context` object of a collection using the same `on` or `once` methods.

```javascript
this.$context.on('error', error => {
	// some action
});
```

## Event names and arguments
Here is a list of Restocat events:

| Event					| When happens									| Arguments																									|
|---------------|-------------------------------|-----------------------------------------------------------|
| trace | Trace message was sent | `String` |
| debug | Debug message was sent | `String` |
| info | Information message was sent | `String` |
| warn | Warning message was sent | `String` |
| error | Error message was sent | `String|Error` |
| fatal | Fatal error message was sent | `String|Error` |
| readyWatchers | Initial scan complete. Ready for changes | Array of [FSWatcher](https://github.com/paulmillr/chokidar#methods--events) |
| collectionLoaded | each component is loaded | `{name: String, properties: Object, constructor: function}` |
| allCollectionsLoaded | all components are loaded | Loaded components by their names |
| incomingMessage | Request message | `IncomingMessage` |

# Request API (IncomingMessage)
Wraps all of the node [http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) APIs, events and properties, plus the following.

* accepts(type:String|Array) - checks if the accept header is present and has the value requested
* acceptsEncoding(type:String|Array) - checks if the request accepts the encoding types
* getContentLength() - gets the content-length header off the request
* getContentType() - gets the content-type header
* getDate() - gets the _date property off the request when created the request
* getLocation() - the current [URI](https://github.com/catberry/catberry-uri) object that constains the current location.
* getRemoteAddr() - Remote address (the search sequence: x-forwarded-for -> ip -> remoteAddress -> socket.remoteAddress -> socket.socket.removeAddress)
* getTime() - returns ms since epoch when request was setup
* getTrailer(trailer:String) - returns any trailer header off the request. also, 'correct' any correctly spelled 'referrer' header to the actual spelling used.
* getHeader(header:String) - returns any trailer header off the request. also, 'correct' any correctly spelled 'referrer' header to the actual spelling used.
* getUserAgent() - the user-agent header
* isChunked() - Check if the incoming request is chunked
* isContentType(type:String) - Check if the incoming request contains the Content-Type header field, and if it contains the given mime type
* isKeepAlive() - Check if the incoming request is kept aliv
* isSecure() - Check if the incoming request is encrypted
* isUpgradeRequest() - Check if the incoming request has been upgraded
* isUpload() - Check if the incoming request is an upload verb

# Response API (ServerResponse)
Wraps all of the node [http.ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse) APIs, events and properties, plus the following.

* cache(type:String, options:Object) - sets the cache-control header. `type` defaults to _public_, and options currently only takes maxAge.
* noCache() - turns off all cache related headers.
* getTime() - returns ms since epoch when request was setup
* charSet(type:String) - Appends the provided character set to the response's Content-Type
* getCharSet() - get char set
* getHeaders() - retrieves all headers off the response
* setHeader(name:String, value:String) - sets headers on the response
* json(code:Number, content:Object, headers:Object) - short hand method for: `res.contentType = 'json'; res.send({hello: 'world'});`
* setLinkHeader(linkKey:String, rel:String) - sets the link header
* send(code:Number, content:Object|Error|Buffer) - sends the response object. convenience method that handles: writeHead(), write(), end() 
* setStatus(code:Number) - sets the http status code on the response

Useful links
============
* [Example](https://github.com/restocat/restocat-example)
* [Default Logger](https://github.com/restocat/restocat-logger)
* [Catberry.js](https://github.com/catberry/catberry)


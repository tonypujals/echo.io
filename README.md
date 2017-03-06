echo.io
=======

[![Build Status](https://drone.io/github.com/tonypujals/echo.io/status.png)](https://drone.io/github.com/tonypujals/echo.io/latest)


A Node.js WebSocket server that echoes its messages and responds to history requests. A client and tests are also provided.

In a nutshell, the server responds to every message by echoing it back to the client. It also responds to the `[HISTORY]` command by returning the last 100 messages in the message history.

For more details, see the following links.

[Features](https://github.com/tonypujals/echo.io/issues/milestones?state=closed)

[Specifications](https://github.com/tonypujals/echo.io/wiki/Specifications)

The echo.io server accepts simple string messages, but it returns messages in `JSON` format.  For details, see the **Protocol** section below.

Demo
----

A live demo that uses echo.io: [http://echo.nodester.io](http://echo.nodester.io) ([source](https://github.com/tonypujals/echo)].

Installation
------------

The latest version is v0.0.6

    npm install git://github.com/tonypujals/echo.io.git#v0.0.6 --save



How to use it
-------------

A server can be opened on ports in the range of 1024 - 65535.


```
var echo = require('echo.io'),
  , port = 5000;
  
var server = new echo.Server();

server.on('error', function(err) {
  console.log(err);
});

server.on('listening', function(port_) {
  console.log('server is listening on port ' + port_);
});

server.start(port);
```

Here is a more complex example demonstrating starting the server from a web application in response to a request:

```
var echo = require('echo.io')
  , echoserver;
  
... (set up app) ...


app.get('/api/v1/echoserver/:port/start', function (req, res) {
  var port = parseInt(req.params.port, 10);
   
  if (echoserver && echoserver.port == port) {
    return res.json({
      status: 'error',
      message: 'address in use ' + port
    });
  }

  echoserver = new echo.Server();

  server.on('error', function(err) {
    console.log('error: ' + err.message);
      
    response = {
      status: 'error',
      message: err.message
    };
    
    res.json(response);
  });

  server.on('listening', function(port_) {
    console.log('echo server started on port ' + port_);
      
    response = {
      status: 'ok',
      message: 'echo server started on port ' + port
    };
    
    res.json(response);
  });

  server.start(port);
});
```

### Events

The server emits the following `error`, `listening`, and `close` events.
 
Typical `error` events include invalid port request, already listening on port, address in use by another process, etc.

 
```
server.on('error', function(err) {
  console.log(err);
});

server.on('listening', function(port) {
  console.log('server is listening on port ' + port);
});

console.on('close', function(port) {
  console.log('server close on port ' + port;
});

```

Communicating with the Server
-----------------------------

You can communicate with the server using WebSockets.

The server connection `URI` is in the following form:

    ws://host:port


#### JavaScript example

Assuming the server is running on localhost port 5555.

```
var ws = new WebSocket('ws://localhost:5555');

ws.onerror = function(err) {
  console.log(err);
};

ws.onopen = function() {
  console.log('open');
};

ws.onclose = function() {
  console.log('close');
};

ws.onmessage = function(messageEvent) {
  // the server message is in the event data property
  var message = JSON.parse(messageEvent.data);
  console.log(message);
};

ws.send('hello world');

```

#### Node example
`echo.io` includes a simple client you can use in from Node.

Assuming the server is running on localhost port 5555.

```
var echo = require('echo.io')
  , url = 'ws://localhost:5555';

var client = new echo.Client(uri);

client.on('error', function(err) {
  console.log(err);
});

client.on('open', function() {
  console.log('open');
});

client.on('close', function() {
  console.log('close');
});

client.on('message', function(message) {
  console.log(message);
});

client.send('hello world');
```

The message that would be printed out in response to the message event would look like this:

```
{
  "status": "OK",
  "type": "message",
  "messages" : [
    "hello world"
  ]
}
```

Protocol
--------

The echo.io server accepts simple string messages, but it returns messages in `JSON` format.

#### Client message

Any message as a string, or a command in brackets. The only supported command is `[HISTORY]`.

#### Server message

The server sends `JSON` messages to clients.

```
{
  status: 'OK' | 'error',
  type: 'message' | 'history',
  messages: []
}
```

The `type` property indicates whether the message is a normal `message` or a `history` message in response to the `[HISTORY]` command.

The `messages` property contains an array of one or more messages (in the case of a 'history' type). The messages are sorted in *newest-to-oldest* order. The most recent message is always at `messages[0]`. Currently the message history maximum is 100 messages.


Implementation details
----------------------

**echo.io** uses the [ws](https://www.npmjs.org/package/ws) package for the underlying WebSocket support.


Tests
-----

You can run [mocha](http://mochajs.org/) tests. Mocha is installed as a dev dependency with the package.

```
$ npm test

or if you already have mocha installed on your system:

$ mocha
```

The test server will run on port 5555.

A screenshot of the current tests:

![test screenshot](https://raw.github.com/tonypujals/echo.io/master/screenshot.png "test screenshot")


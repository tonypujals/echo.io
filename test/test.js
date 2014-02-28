var assert = require('assert')
  , _ = require('underscore')
  , echo = require('..')
  , port = 5555
  , uri = 'ws://localhost:' + port
  ;

var notImplementedError = new Error('not implemented yet');

describe('ring buffer test suite', function () {
  var RingBuffer = require('../lib/util/ringbuffer');

  it('should create a ring buffer with a default capacity of 100', function () {
    var rb = new RingBuffer();
    assert.equal(rb.capacity(), 100);
  });

  it('should throw when specifying an invalid capacity', function () {
    try {
      var rb = new RingBuffer(0);
    } catch (err) {
      assert(/^capacity/.test(err.message));
    }
  });

  it('should create a ring buffer with the specified capacity', function () {
    var capacity = 50;
    var rb = new RingBuffer(capacity);
    assert.equal(rb.capacity(), capacity);
  })

  it('should increase size as elements are pushed (but not greater than capacity)', function () {
    var capacity = 3;
    var rb = new RingBuffer(capacity);

    assert.equal(rb.size(), 0);
    assert.equal(rb.head(), null);
    assert.equal(rb.tail(), null);

    rb.push('element-1');
    assert(rb.size(), 1);

    rb.push('element-2');
    assert(rb.size(), 2);

    rb.push('element-3');
    assert(rb.size(), 3);

    // assert size won't continue to increase
    // (can't be greater than the capacity)
    rb.push('element-4');
    assert(rb.size(), rb.capacity());

    rb.push('element-5');
    assert(rb.size(), rb.capacity());
  });

  it('should return last pushed element for head', function () {
    var capacity = 3;
    var rb = new RingBuffer(capacity);

    rb.push('element-1');
    assert(rb.head(), 'element-1');

    rb.push('element-2');
    assert(rb.head(), 'element-2');

    rb.push('element-3');
    assert(rb.head(), 'element-3');

    rb.push('element-4');
    assert(rb.head(), 'element-4');

    rb.push('element-5');
    assert(rb.head(), 'element-5');
  });

  it('should return oldest element for tail', function () {
    var capacity = 3;
    var rb = new RingBuffer(capacity);

    rb.push('element-1');
    assert(rb.tail(), 'element-1');

    rb.push('element-2');
    assert(rb.tail(), 'element-1');

    rb.push('element-3');
    assert(rb.tail(), 'element-1');

    // should purge element-1 from buffer
    rb.push('element-4');
    assert(rb.tail(), 'element-2');

    // should purge element-2 from buffer
    rb.push('element-5');
    assert(rb.tail(), 'element-3');
  });

  it('should be able to peek at previous elements', function () {
    // prepare an array with 10 values to use for testing
    var a = _.range(10).map(function (val) { return 'element-' + val });

    // add to ringbuffer that can only hold 3 elements
    var rb = new RingBuffer(3);
    _.each(a, function (value) { rb.push(value) });

    // ensure that size only increased up to the capacity
    assert.equal(rb.size(), rb.capacity());

    // peek at all previous elements and verify
    for (var i = 0; i < rb.size(); i++) {
      var actual = rb.peek(i);
      var expected = a[a.length - 1 - i];
      assert.equal(actual, expected);
    }
  });

  it('should be able to return array in last-to-first order (buffer not full)', function () {
    // prepare an array with 3 values to use for testing
    var a = _.range(3).map(function (val) { return 'element-' + val });

    // add to ringbuffer that can only hold 10 elements
    var rb = new RingBuffer(10);
    _.each(a, function (value) { rb.push(value) });

    var history = rb.toArray();

    // peek at all previous elements and verify
    for (var i = 0; i < rb.size(); i++) {
      var actual = history[i];
      var expected = a[a.length - 1 - i];
      assert.equal(actual, expected);
    }
  });

  it('should be able to return array in last-to-first order (buffer full)', function () {
    // prepare an array with 10 values to use for testing
    var a = _.range(10).map(function (val) { return 'element-' + val });

    // add to ringbuffer that can only hold 3 elements
    var rb = new RingBuffer(3);
    _.each(a, function (value) { rb.push(value) });

    var history = rb.toArray();

    // peek at all previous elements and verify
    for (var i = 0; i < rb.size(); i++) {
      var actual = history[i];
      var expected = a[a.length - 1 - i];
      assert.equal(actual, expected);
    }
  });
});

describe('echo server test suite', function () {

  it('should start on specified TCP port', function (done) {
    var server = new echo.Server(port);
    server.start(function (err) {
      // release port for subsequent tests
      if (!err) server.close();
      done(err);
    });
  });

  it('should callback with an error when the address is in use', function (done) {
    var server = new echo.Server(port);

    server.start(function (err) {
      if (err) return done(err);

      // server started ok
      // confirm that we can't start another server on the same port
      var server2 = new echo.Server(port);
      server2.start(function (err) {
        // release port for subsequent tests
        server.close();

        // expected a callback error
        assert.equal(err.code, 'EADDRINUSE');
        done();
      })
    });
  });

  it('should echo received messages', function (done) {
    var message = 'hello';

    var server = new echo.Server(port);
    var client = new echo.Client(uri);

    server.start(function (err) {
      if (err) return done(err);

      client.on('message', function (echo) {
        // release port for subsequent tests
        server.close();

        assert.equal(echo.messages[0], message);
        done();
      });

      client.on('open', function () {
        client.send(message);
      });
    });

  });

  it('should process HISTORY command to return message history', function (done) {
    var count = 200;
    var max = count > 100 ? 100 : count;

    // prepare an array with all the messages
    var messages = _.range(count).map(function (val) { return 'message-' + val });

    var server = new echo.Server(port);
    var client = new echo.Client(uri);

    server.start(function (err) {
      if (err) return done(err);
      var i = 0;

      client.on('message', function (message) {
        i++;

        if (i == count) {
          // all the messages have been sent
          client.sendHistoryCommand();
        }

        if (i > count) {
          // after all of the echoes, this is the history message
          var history = message.messages;
          // console.log(message);

          assert.equal(history.length, max);

          // compare history to sent messages
          for (i = 0; i < max; i++) {
            var actual = history[i];
            var expected = messages[messages.length - i - 1];
            assert(actual, expected);
          }

          server.close();
          done();
        }
      });

      client.on('open', function () {
        _.each(messages, function(message) {
          client.send(message);
        });
      });
    });
  });

});

describe('echo client test suite', function () {

  it('should report error when unable to connect', function (done) {
    var message = 'hello';
    var client = new echo.Client(uri);

    client.on('error', function(err) {
      assert.equal(err.code, 'ECONNREFUSED');
      done();
    });
  });

  it('should send messages on specified port', function (done) {
    var message = 'hello';

    var server = new echo.Server(port);
    var client = new echo.Client(uri);

    server.start(function (err) {
      if (err) return done(err);

      client.on('message', function (echo) {
        // release port for subsequent tests
        server.close();

        assert.equal(echo.messages[0], message);
        done();
      });

      client.on('open', function () {
        client.send(message);
      });
    });
  });

  it('should return server response plus response time', function (done) {
    var message = 'hello';

    var server = new echo.Server(port);
    var client = new echo.Client(uri);

    server.start(function (err) {
      if (err) return done(err);

      client.on('message', function (echo) {
        // release port for subsequent tests
        server.close();

        assert.equal(echo.messages[0], message);
        assert.equal(typeof echo.responseTime, 'number');
        assert(echo.responseTime >= 0);

        done();
      });

      client.on('open', function () {
        client.send(message);
      });
    });
  });

  it('should be able to filter message history', function (done) {
    // prepare an array with all the messages
    var messages = [
      'how now brown cow',
      'hello world',
      'silly sally sells seashells by the seashore',
      'goodbye cruel world'
    ];

    var count = messages.length;

    var server = new echo.Server(port);
    var client = new echo.Client(uri);

    server.start(function (err) {
      if (err) return done(err);
      var i = 0;

      client.on('message', function (message) {
        var actual, expected, filtered;

        i++;

        if (i == count) {
          // all the messages have been sent
          client.sendHistoryCommand();
        }

        if (i > count) {
          // after all of the echoes, this is the history message
          var history = message.messages;
          // console.log(message);

          // compare history to sent messages
          for (i = 0; i < count; i++) {
            actual = history[i];
            expected = messages[messages.length - i - 1];
            assert(actual, expected);
          }

          filtered = client.historyFilter('e').messages;
          assert(filtered[0], messages[3]);
          assert(filtered[1], messages[2]);
          assert(filtered[2], messages[1]);

          filtered = client.historyFilter('BROWN').messages;
          assert(filtered[0], messages[0]);

          filtered = client.historyFilter('kitty').messages;
          assert.equal(filtered.length, 0);

          server.close();
          done();
        }
      });

      client.on('open', function () {
        _.each(messages, function(message) {
          client.send(message);
        });
      });
    });
  });

});


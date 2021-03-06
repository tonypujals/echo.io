var RingBuffer = require('./util/ringbuffer');

/**
 * History saves messages up the specfied capacity; older
 * messages are overwritten once at capacity
 * We abstract the fact that we're using a RingBuffer for the
 * internal data structure.
 */
var History = module.exports = function(capacity) {
  this.buffer = new RingBuffer(capacity);
};

/**
 * Adds message to the history buffer. When the buffer
 * limit is reached, older messages are overwritten.
 * @param message
 */
History.prototype.push = function(message) {
  this.buffer.push(message);
};

/**
 * Returns an array of the messages in history in
 * newest-to-oldest order.
 */
History.prototype.toArray = function() {
  return this.buffer.toArray();
};


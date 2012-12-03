var
// Node modules
	Stream = require('stream'),
	spawn = require('child_process').spawn,

// Npm modules
	_ = require('lodash'),
	es = require('event-stream');

// The ice-stream constructor
var istream = module.exports = function (stream) {
	// exit early if already wrapped, even if wrapped by a different ice-stream constructor
	if ( stream && typeof stream == 'object' && stream.__wrapped__ ) {
		return stream;
	}
	// allow invoking ice-stream without the `new` operator
	if ( !(this instanceof istream) ) {
		return new istream(stream);
	}

	// If the stream is text, make it an array
	if ( _.isString(stream) )
		stream = [stream];

	// If the stream is an array, turn it into a stream
	if ( _.isArray(stream) )
		stream = es.readArray(stream);

	this.__wrapped__ = stream;
};

/**
 * Returns the stream wrapped by ice-stream
 * @return {Stream}
 */
istream.prototype.stream = function () {
	return this.__wrapped__;
};

/**
 * A helper method to start chaining
 * @param stream
 * @return {istream}
 */
istream.chain = function (stream) {
	return new istream(stream);
};


/********************
 * Stream creators
 ********************/

/**
 * Takes a command and turns it into a duplex stream
 * @param command
 * @param options
 * @return {Stream}
 */
istream.exec = function (command, options) {
	var stream = new Stream();
	stream.readable = true;
	stream.writable = true;
	stream.reemit = reemit;
	stream.relay = relay;

	var args = command ? command.split(' ') : [];
	var proc = spawn(args.shift(), args, options);

	// Readable/writable common interface

	// Destroy everything when told to
	stream.destroy = function () {
		this.readable = false;
		this.writable = false;
		proc.stdout.destroy();
		proc.stderr.destroy();
		proc.stdin.destroy();
	};

	// Only emit 'close' when all 3 streams have closed
	var numClosed = 0;

	function checkClosed() {
		if ( ++numClosed === 3 ) {
			stream.emit('close');
		}
	}

	// stdout relaying
	stream.relay(proc.stdout, ['setEncoding', 'pause', 'resume', 'pipe']);
	stream.reemit(proc.stdout, ['data', 'end', 'error']);

	proc.stdout.on('close', checkClosed);

	// stdin relaying
	stream.relay(proc.stdin, ['write', 'end', 'destroySoon']);
	stream.reemit(proc.stdin, ['drain', 'pipe', 'error', 'close']);

	proc.stdin.on('close', checkClosed);

	// stderr relaying
	proc.stderr.on('close', checkClosed);
	proc.stderr.on('data', function (data) {
		stream.emit('error', new Error(data.toString()));
	});

	return stream;
};

/**
 * Splits a stream at a provided dilimiter (newline by default)
 * @param delimiter
 * @return {Stream}
 */
istream.split = function (delimiter) {
	return es.split(delimiter);
};

/**
 * Filters a set of chunks based on a synchronous user function
 * @param fn
 * @return {Stream}
 */
istream.filter = function (fn) {
	if ( !_.isFunction(fn) )
		throw new Error('Invalid parameter');

	return es.through(function (chunk) {
		if ( fn(chunk) ) {
			this.emit('data', chunk);
		}
		return true
	});
};

/**
 * Filters a set of chunks based on a asynchronous user function.
 * Note: chunk order is not guaranteed to remain constant. Use filterAynscSeries for that.
 * @param fn
 * @return {Stream}
 */
istream.filterAsync = function (fn) {
	if ( !_.isFunction(fn) )
		throw new Error('Invalid parameter');

	// The number of filter callbacks waiting
	var waiting = 0;

	return es.through(function (chunk) {
		var o1 = this;

		waiting++;
		fn(chunk, function (keep) {
			if ( keep ) o1.emit('data', chunk);
			waiting--;

			// If no callbacks are waiting and no more data will come, end the reader
			if ( !o1.writeable && waiting === 0 ) {
				o1.emit('end');
			}
		});
		return true
	}, function () {
	});
};

/**
 * Filters a set of chunks based on a asynchronous user function, 1 chunk at a time
 * @param fn
 * @return {Stream}
 */
istream.filterAsyncSeries = function (fn) {
	if ( !_.isFunction(fn) )
		throw new Error('Invalid parameter');

	// Even though we are returning false to put backpressure, there still may be multiple chunks at once
	// We have to cache the chunks and the filter results, so that we can output in order
	var resultQueue = [];
	return es.through(function (chunk) {
		var o1 = this;

		var item = {
			'chunk' : chunk
		};

		resultQueue.push(item);

		fn(chunk, function (keep) {
			item.keep = keep;

			// Emit as many as many chunks as we can starting from the bottom
			var i = 0;
			for ( i = 0; i < resultQueue.length && typeof resultQueue[i].keep !== 'undefined'; i++ ) {
				item = resultQueue[i];
				if ( item.keep ) {
					o1.emit('data', item.chunk);
				}
			}

			// If we emitted some chunks, remove that data from the queue
			if ( i > 0 ) {
				resultQueue = resultQueue.slice(i);
			}

			// If we emitted all of the data, yay! Reset!
			if ( !resultQueue.length ) {
				// If no callbacks are waiting and no more data will come, end the reader
				o1.emit(o1.writeable ? 'drain' : 'end');
			}
		});

		// Return false to indicate things are full
		return false;
	}, function () {
	});
};

/********************
 * Stream consumers
 ********************/

/**
 * A helper method to pipe a stream to stdout
 */
istream.out = function (stream) {
	stream.pipe(process.stdout);
};


/**
 * Simple utility function to set up an object to re-emit another objects events
 * @param object
 * @param events
 */
function reemit(object, events) {
	var o1 = this;
	if ( typeof events === 'string' ) {
		events = [events];
	}
	events.forEach(function (event) {
		object.on(event, function () {
			var args = Array.prototype.slice.call(arguments, 0);
			args.unshift(event);
			o1.emit.apply(o1, args);
		});
	});
}

/**
 * Simple utility function to set up an object to forward function calls to another object
 * @param object
 * @param methods
 */
function relay(object, methods) {
	var o1 = this;
	if ( typeof methods === 'string' ) {
		methods = [methods];
	}
	var i = methods.length;
	methods.forEach(function (method) {
		o1[method] = function () {
			object[method].apply(object, arguments);
		}
	});
}


// Add the stream constructor functions to the prototype
['exec', 'split', 'filter', 'filterAsync', 'filterAsyncSeries'].forEach(function (func) {
	istream.prototype[func] = function () {
		// This function will create a new stream, which the current steam must be piped to
		var next = istream[func].apply(null, arguments);

		// It is possible that this doesn't have a stream, or that it wraps something else, so check
		if ( this.__wrapped__ ) {
			if ( this.__wrapped__.readable ) {
				this.__wrapped__.pipe(next);
			} else {
				// Assume __wrapped__ is something else, like a string or object, and write it
				next.write(__wrapped__);
			}
		}
		return new istream(next);
	}
});

// Add the stream consumer functions to the prototype
['out'].forEach(function (func) {
	istream.prototype[func] = function () {
		if ( this.__wrapped__ ) {
			var args = Array.prototype.slice.call(arguments, 0);
			args.unshift(this.__wrapped__);
			istream[func].apply(null, args);
		}

		return this;
	}
});
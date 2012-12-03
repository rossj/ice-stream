var
// Node modules
	Stream = require('stream'),
	spawn = require('child_process').spawn;

// The ice-stream constructor
var istream = module.exports = function(stream) {
	// exit early if already wrapped, even if wrapped by a different ice-stream constructor
	if (stream && typeof stream == 'object' && stream.__wrapped__) {
		return stream;
	}
	// allow invoking ice-stream without the `new` operator
	if (!(this instanceof istream)) {
		return new istream(stream);
	}
	this.__wrapped__ = stream;
};

/**
 * Returns the stream wrapped by ice-stream
 * @return {Stream}
 */
istream.prototype.stream = function() {
	return this.__wrapped__;
};

/**
 * A helper method to start chaining
 * @param stream
 * @return {istream}
 */
istream.chain = function(stream) {
	return new istream(stream);
};

/**
 * Takes a command and turns it into a duplex stream
 * @param command
 * @param options
 * @return {Stream}
 */
istream.exec = function(command, options) {
	var stream = new Stream();
	stream.readable = true;
	stream.writable = true;
	stream.reemit = reemit;

	command = command || '';
	command = command.split(' ');
	var proc = spawn(command.shift(), command, options);

	proc.on('exit', function(code) {
		// Wait at tick for any 'data' events which may not have fired off yet
		process.nextTick(function() {
			stream.emit('end');
		});
	});

	// Readable interface
	stream.reemit(proc.stdout, 'data');

	proc.stderr.on('data', function(chunk) {
		stream.emit('error', new Error(chunk.toString()));
	});

	// Writeable interface
	stream.write = function (buf) {
		return proc.stdin.write(buf);
	};

	stream.reemit(proc.stdin, 'drain');

	stream.end = function (buf) {
		proc.stdin.end(buf);
	};

	stream.destroy = function () {
		proc.stream.destroy();
	};

	return stream;
};


/**
 * Simple utility function to set up an object to re-emit another objects event
 * @param object
 * @param event
 */
function reemit(object, event) {
	var o1 = this;
	object.on(event, function() {
		var args = Array.prototype.slice.call(arguments, 0);
		args.unshift(event);
		o1.emit.apply(o1, args);
	});
}


// Add the ice-stream functions to the prototype to allow chaining
['exec'].forEach(function(func) {
	istream.prototype[func] = function() {
		// This function will create a new stream, which the current steam must be piped to
		var next = istream[func].apply(null, arguments);

		// It is possible that this doesn't have a stream, so check
		if (this.__wrapped__)
			this.__wrapped__.pipe(next);

		return new istream(next);
	}
});


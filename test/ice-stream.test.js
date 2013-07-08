/*global describe, it*/
var
// Node modules
	fs = require('fs'),
	Stream = require('stream'),

// Npm modules
	_ = require('lodash'),
	should = require('should'),

// Project modules
	istream = require('../lib/ice-stream.js'),

// File vars
	testFilePath = __dirname + '/testfile.txt',
	testFileData = fs.readFileSync(testFilePath, 'utf-8');

describe('istream', function () {
	/**
	 * Asserts that the final contents of a stream match the given data
	 * @param stream
	 * @param data
	 */
	function assertStreamData(stream, data, cb) {
		if (!stream.readable) {
			cb(new Error('stream not readable'));
		}

		var isString = _.isString(data);
		var buf = isString ? '' : [];
		stream.on('data', function (chunk) {
			if ( isString )
				buf += chunk;
			else {
				buf.push(chunk);
			}
		});

		stream.on('end', function () {
			// Check that the message got through to stdin - we sent it twice
			buf.should.eql(data);
			cb();
		});
	}

	/**
	 * Asserts that the content and order of each stream chunk
	 * @param stream
	 * @param data
	 * @param cb
	 */
	function assertStreamChunks(stream, data, order, cb) {
		if (!stream.readable) {
			cb(new Error('stream not readable'));
		}

		var pieces = [];
		stream.on('data', function (chunk) {
			pieces.push(chunk);
		});

		stream.on('end', function () {
			// Check that the message got through to stdin - we sent it twice
			if ( order ) {
				// Assert the array contents and order match
				pieces.should.eql(data);
			} else {
				// We don't care about order to just make sure the arrays are same size
				// and contain same elements
				pieces.length.should.equal(data.length);
				_.difference(pieces, data).should.have.length(0);
			}
			cb();
		});
	}

	describe('Static methods', function () {
		it('static stream methods should return unwrapped streams', function() {
			var stream = istream.base64decode();
			stream.write('YW55IGNhcm5hbCBwbGVhc3VyZS4=');
			stream.read().toString().should.equal('any carnal pleasure.');
		});
	});

	describe('Chaining', function () {
		it('should allow chaining of streams using ice-stream as method or constructor', function() {
			var stream = istream().base64decode().stream();
			stream.write('YW55IGNhcm5hbCBwbGVhc3VyZS4=');
			stream.read().toString().should.equal('any carnal pleasure.');
		});
	});

	describe('Constructor', function () {
		it('should return a Streamit object when called without "new"', function () {
			var s = istream();
			s.should.be.an.instanceOf(istream);
		});

		it('should return a Streamit object when called with "new"', function () {
			var s = new istream();
			s.should.be.an.instanceOf(istream);
		});

		it('should accept a string as a parameter and make it a stream', function (cb) {
			var msg = 'hello this is a string';
			var s = new istream(msg);
			s.should.be.an.instanceOf(istream);
			assertStreamData(s.stream(), msg, cb);
		});

		it('should accept an array as a parameter and make it a stream', function (cb) {
			var msg = [1, 5, 2, 5, 2];
			var s = new istream(msg);
			s.should.be.an.instanceOf(istream);
			assertStreamData(s.stream(), msg, cb);
		});
	});

	describe('exec', function () {
		it('should return a readable, writeable Stream object', function () {
			var s = istream.exec('echo hello');
			s.should.be.an.instanceOf(Stream);
			s.readable.should.equal(true);
			s.writable.should.equal(true);
		});

		it('should emit "error" event if the command is invalid', function (cb) {
			var s = istream.exec('dfkjaf23jfadfadsf');
			s.on('error', function (err) {
				err.should.be.an.instanceOf(Error);
				cb();
			})
		});

		it('should fire "data" and "end" events with stdout', function (cb) {
			var msg = 'hello there';
			var s = istream.exec('echo ' + msg);

			// Check that the message comes through stdout - echo adds a newline
			assertStreamData(s, msg + '\n', cb);
		});

		it('should accept #write and #end calls and pass to stdin', function (cb) {
			var msg = 'hello there';
			var s = istream.exec('cat');

			// Write the message to stdin - it should reappear on stdout because we are using the 'cat' command
			s.write(msg);
			s.end(msg);

			// Check that the message got through to stdin - we sent it twice
			assertStreamData(s, msg + msg, cb);
		});
	});

	describe('split', function () {
		it('should split on newline by default', function (cb) {
			var msg = 'hello\nhow\nare\nyou\ndoing?';
			var s = istream(msg).split().stream();
			assertStreamChunks(s, msg.split('\n'), true, cb);
		});

		it('should split on given dilimiter', function (cb) {
			var msg = 'hello how are you doing?';
			var s = istream(msg).split('o').stream();
			assertStreamChunks(s, msg.split('o'), true, cb);
		});
	});

	describe('join', function () {
		it('should join on newline by default', function (cb) {
			var msg = 'hello how are you doing?';
			var s = istream(msg).split(' ').join().stream();
			assertStreamData(s, msg.split(' ').join('\n'), cb);
		});

		it('should split on given dilimiter', function (cb) {
			var msg = 'hello how are you doing?';
			var s = istream(msg).split(' ').join('-').stream();
			assertStreamData(s, msg.split(' ').join('-'), cb);
		});
	});

	describe('map', function() {
		var msg = 'We wILL use Map to CHange THIS STring to Lower Case';
		var result = msg.toLowerCase();

		it ('map should work with a synchronous function and maintain order', function(cb) {
			var s = istream(msg).split(' ').map(function (chunk) {
				return chunk.toLowerCase();
			}).join(' ').stream();
			assertStreamData(s, result, cb);
		});

		it('mapAsync should work with async function and maybe maintain order', function (cb) {
			var s = istream(msg).split(' ').mapAsync(function (chunk, cb) {
				// Simulate some varying callback times
				var ms = Math.floor((Math.random() * 500) + 1);
				setTimeout(function () {
					cb(null, chunk.toLowerCase());
				}, ms);
			}).stream();
			assertStreamChunks(s, result.split(' '), false, cb);
		});

		it('mapAsync should emit an "error" if it is returned from the callback', function (cb) {
			var s = istream(msg).split(' ').mapAsync(function (chunk, cb) {
				// Simulate some varying callback times
				var ms = Math.floor((Math.random() * 500) + 1);
				setTimeout(function () {
					cb(new Error('random error'));
				}, ms);
			}).stream().on('error', _.once(function(err) {
				cb();
			}));
		});

		it('mapAsyncSeries should work with async function and maintain order', function (cb) {
			var s = istream(msg).split(' ').mapAsyncSeries(function (chunk, cb) {
				// Simulate some varying callback times
				var ms = Math.floor((Math.random() * 500) + 1);
				setTimeout(function () {
					cb(null, chunk.toLowerCase());
				}, ms);
			}).join(' ').stream();
			assertStreamData(s, result, cb);
		});

		it('mapAsyncSeries should emit an "error" if it is returned from the callback', function (cb) {
			var s = istream(msg).split(' ').mapAsync(function (chunk, cb) {
				// Simulate some varying callback times
				var ms = Math.floor((Math.random() * 500) + 1);
				setTimeout(function () {
					cb(new Error('random error'));
				}, ms);
			}).stream().on('error', _.once(function(err) {
				cb();
			}));
		});
	});

	describe('filter', function () {
		var msg = 'get rid of all words that contain the letter e';
		var result = 'rid of all words that contain';

		it('filter should work with synchronous function and maintain order', function (cb) {
			var s = istream(msg).split(' ').filter(function (chunk) {
				return chunk.indexOf('e') === -1;
			}).join(' ').stream();
			assertStreamData(s, result, cb);
		});

		it('filterAsync should work with async function and maybe maintain order', function (cb) {
			var s = istream(msg).split(' ').filterAsync(function (chunk, cb) {
				// Simulate some varying callback times
				var ms = Math.floor((Math.random() * 500) + 1);
				setTimeout(function () {
					cb(chunk.indexOf('e') === -1);
				}, ms);
			}).stream();
			assertStreamChunks(s, result.split(' '), false, cb);
		});

		it('filterAsyncSeries should work with async function and maintain order', function (cb) {
			var s = istream(msg).split(' ').filterAsyncSeries(function (chunk, cb) {
				// Simulate some varying callback times
				var ms = Math.floor((Math.random() * 500) + 1);
				setTimeout(function () {
					cb(chunk.indexOf('e') === -1);
				}, ms);
			}).join(' ').stream();
			assertStreamData(s, result, cb);
		});
	});

	describe('dropUntil', function() {
		it('should emit remaining stream after matching whole chunk', function(cb) {
			var input = 'hello this is blah and I am streaming blah';
			var output = ' and I am streaming blah';
			var s = istream(input).split(' ').join(' ').dropUntil('blah').stream();
			assertStreamData(s, output, cb);
		});
		it('should emit remaining stream after matching whole chunk, including match if specified', function(cb) {
			var input = 'hello this is blah and I am streaming blah';
			var output = 'blah and I am streaming blah';
			var s = istream(input).split(' ').join(' ').dropUntil('blah', true).stream();
			assertStreamData(s, output, cb);
		});
		it('should emit remaining stream after matching across chunks', function(cb) {
			var input = 'hello this is blah and I am streaming blah';
			var output = 'h and I am streaming blah';
			var s = istream(input).split(' ').join(' ').dropUntil('s bla').stream();
			assertStreamData(s, output, cb);
		});
		it('should emit remaining stream after matching across chunks, including match if specified', function(cb) {
			var input = 'hello this is blah and I am streaming blah';
			var output = 's blah and I am streaming blah';
			var s = istream(input).split(' ').join(' ').dropUntil('s bla', true).stream();
			assertStreamData(s, output, cb);
		});
	});

	describe('dropUntilChunk', function() {
		it('should emit remaining stream after matching using string', function(cb) {
			var input = 'hello this is blah and I am streaming blah';
			var output = ' and I am streaming blah';
			var s = istream(input).split(' ').join(' ').dropUntilChunk('blah').stream();
			assertStreamData(s, output, cb);
		});
		it('should emit remaining stream after matching using RegExp chunk', function(cb) {
			var input = 'hello this is blah and I am streaming blah';
			var output = ' and I am streaming blah';
			var s = istream(input).split(' ').join(' ').dropUntilChunk(/bLaH/i).stream();
			assertStreamData(s, output, cb);
		});
		it('should emit remaining stream after matching using function', function(cb) {
			var input = 'hello this is blah and I am streaming blah';
			var output = ' and I am streaming blah';
			var s = istream(input).split(' ').join(' ').dropUntilChunk(function(chunk) {
				return chunk === 'blah';
			}).stream();
			assertStreamData(s, output, cb);
		});
		it('should emit remaining stream after matching using function, including match if specified', function(cb) {
			var input = 'hello this is blah and I am streaming blah';
			var output = 'blah and I am streaming blah';
			var s = istream(input).split(' ').join(' ').dropUntilChunk(function(chunk) {
				return chunk === 'blah';
			}, true).stream();
			assertStreamData(s, output, cb);
		});
	});

	describe('toLower, toUpper', function() {
		var msg = 'this is A MIxTureE of case';

		it('should convert stream to lower case', function(cb) {
			var s = istream(msg).toLower().stream();
			assertStreamData(s, msg.toLowerCase(), cb);
		});

		it('should convert stream to upper case', function(cb) {
			var s = istream(msg).toUpper().stream();
			assertStreamData(s, msg.toUpperCase(), cb);
		});
	});

	describe('unique', function() {
		it('should only output unique string parts', function(cb) {
			var nums = 'one two three one four six nine four';
			var s = istream(nums).split(' ').unique().stream();
			assertStreamChunks(s, _.unique(nums.split(' ')), false, cb);
		});

		it('should only output unique array parts', function(cb) {
			var nums = [1, 2, 3, 1, 4, 6, 9, 4];
			var s = istream(nums).unique().stream();
			assertStreamChunks(s, _.unique(nums), false, cb);
		});
	});

	describe('without', function() {
		it('should not output specified strings', function(cb) {
			var nums = 'one two three one four six nine four';
			var s = istream(nums).split(' ').without('one', 'four').stream();
			assertStreamChunks(s, _.without(nums.split(' '), 'one', 'four'), false, cb);
		});

		it('should not output specified array values', function(cb) {
			var nums = [1, 2, 3, 1, 4, 6, 9, 4];
			var s = istream(nums).without(1, 4).stream();
			assertStreamChunks(s, _.without(nums, 1, 4), false, cb);
		});
	});

	describe('chaining', function () {
		it('should pipe output down a whole chain starting with a ice-stream object', function (cb) {
			var msg = 'hello there how are you';
			var s = istream(msg).exec('cat').exec('cat').exec('cat').exec('cat').stream();
			assertStreamData(s, msg, cb);
		});

		it('should pipe output down a whole chain starting with nothing', function (cb) {
			var msg = 'hello there how are you';
			var s = istream.chain().exec('echo ' + msg).exec('cat').exec('cat').exec('cat').stream();
			assertStreamData(s, msg + '\n', cb);
		});
	});

	describe('each', function() {
		it('should run the callback for every chunk', function(cb) {
			var msg = 'hello there how are you';
			var output = '';
			var s = istream(msg).split(' ').each(function(chunk) {
				output += chunk;
			});
			s.stream().on('end', function() {
				output.should.equal(msg.replace(/ /g, ''));
				cb();
			});
		});
		it('should allow chaining after #each()', function(cb) {
			var msg = 'hello there how are you';
			var s = istream(msg).split(' ').each(function() { }).join(' ').stream();
			assertStreamData(s, msg, cb);
		});
	});

	describe('count', function() {
		it('should return the number of chunks to the callback', function(cb) {
			var msg = 'hello there how are you';
			var count;
			var s = istream(msg).split(' ').count(function(c) {
				count = c;
			});
			s.stream().on('end', function() {
				count.should.equal(msg.split(' ').length);
				cb();
			});
		});
	});

	describe('chars', function() {
		var msg = 'hello there how are you';

		it('should return the number of chars in a string to the callback', function(cb) {
			var count;
			var s = istream(msg).split(' ').join(' ').chars(function(c) {
				count = c;
			});
			s.stream().on('end', function() {
				count.should.equal(msg.length);
				cb();
			});
		});

		it('should return the number of chars in a Buffer to the callback', function(cb) {
			var count;
			var s = istream([new Buffer(msg)]).chars(function(c) {
				count = c;
			});
			s.stream().on('end', function() {
				count.should.equal(msg.length);
				cb();
			});
		});
	});

	describe('bytes', function() {
		var msg = 'hello there how are you';

		it('should return the number of bytes in a string to the callback', function(cb) {
			var count;
			var s = istream(msg).split(' ').join(' ').bytes(function(c) {
				count = c;
			});
			s.stream().on('end', function() {
				count.should.equal(Buffer.byteLength(msg));
				cb();
			});
		});

		it('should return the number of bytes in a Buffer to the callback', function(cb) {
			var count;
			var s = istream([new Buffer(msg)]).bytes(function(c) {
				count = c;
			});
			s.stream().on('end', function() {
				count.should.equal(new Buffer(msg).length);
				cb();
			});
		});
	});

	describe('count', function() {
		it('should return the number of chunks to the callback', function(cb) {
			var msg = 'hello there how are you';
			var count;
			var s = istream(msg).split(' ').count(function(c) {
				count = c;
			});
			s.stream().on('end', function() {
				count.should.equal(msg.split(' ').length);
				cb();
			});
		});
	});
});
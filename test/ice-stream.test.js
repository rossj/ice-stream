var
// Node modules
	fs = require('fs'),
	Stream = require('stream'),

// Npm modules
	should = require('should'),

// Project modules
	istream = require('../lib/ice-stream.js'),

// File vars
	testFilePath = __dirname + '/testfile.txt',
	testFileData = fs.readFileSync(testFilePath, 'utf-8');

describe('istream', function() {
	/**
	 * Asserts that the final contents of a stream match the given data
	 * @param stream
	 * @param data
	 */
	function assertStreamData(stream, data, cb) {
		var buf = '';
		stream.on('data', function(chunk) {
			buf += chunk;
		});

		stream.on('end', function() {
			// Check that the message got through to stdin - we sent it twice
			buf.should.equal(data);
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
		var pieces = [];
		stream.on('data', function(chunk) {
			pieces.push(chunk);
		});

		stream.on('end', function() {
			// Check that the message got through to stdin - we sent it twice
			if (order) {
				// Assert the array contents and order match
				pieces.should.eql(data);
			} else {
				// We don't care about order to just make sure the arrays are same size
				// and contain same elements
				pieces.length.should.equal(data.length);
				for (var i = 0; i < data.length; i++) {
					pieces.should.include(data[i]);
				}
			}
			cb();
		});
	}

	describe('Constructor', function() {
		it('should return a Streamit object when called without "new"', function() {
			var s = istream();
			s.should.be.an.instanceOf(istream);
		});

		it('should return a Streamit object when called with "new"', function() {
			var s = new istream();
			s.should.be.an.instanceOf(istream);
		});
	});
	describe('exec', function() {
		it('should return a readable, writeable Stream object', function() {
			var s = istream.exec('echo hello');
			s.should.be.an.instanceOf(Stream);
			s.readable.should.equal(true);
			s.writable.should.equal(true);
		});

		it('should emit "error" event if the command is invalid', function(cb) {
			var s = istream.exec('dfkjaf23jfadfadsf');
			s.on('error', function(err) {
				err.should.be.an.instanceOf(Error);
				cb();
			})
		});

		it('should fire "data" and "end" events with stdout', function(cb) {
			var msg = 'hello there';
			var s = istream.exec('echo ' + msg);

			// Check that the message comes through stdout - echo adds a newline
			assertStreamData(s, msg + '\n', cb);
		});

		it('should accept #write and #end calls and pass to stdin', function(cb) {
			var msg = 'hello there';
			var s = istream.exec('cat');

			// Write the message to stdin - it should reappear on stdout because we are using the 'cat' command
			s.write(msg);
			s.end(msg);

			// Check that the message got through to stdin - we sent it twice
			assertStreamData(s, msg + msg, cb);
		});
	});

	describe('split', function(cb) {
		it('should split on newline by default', function(cb) {
			var msg = 'hello\nhow\nare\nyou\ndoing?';
			var s = istream().exec('echo ' + msg).split().stream();
			assertStreamChunks(s, msg.split('\n'), true, cb);
		});

		it('should split on given dilimiter', function(cb) {
			var msg = 'hello how are you doing?';
			var s = istream().exec('echo ' + msg).split('o').stream();
			assertStreamChunks(s, (msg + '\n').split('o'), true, cb);
		});
	});

	describe('filter', function(cb) {
		var msg = 'get rid of all words that contain the letter e';
		var result = 'rid of all words that contain';

		it('filter should work with synchronous function and maintain order', function(cb) {
			var s = istream().exec('echo ' + msg).split(' ').filter(function(chunk) {
				return chunk.indexOf('e') === -1;
			}).stream();
			assertStreamChunks(s, result.split(' '), true, cb);
		});

		it('filterAsync should work with async function and maybe maintain order', function(cb) {
			var s = istream().exec('echo ' + msg).split(' ').filterAsync(function(chunk, cb) {
				// Simulate some varying callback times
				var ms = Math.floor((Math.random()*500)+1);
				setTimeout(function() {
					cb(chunk.indexOf('e') === -1);
				}, ms);
			}).stream();
			assertStreamChunks(s, result.split(' '), false, cb);
		});

		it('filterAsyncSeries should work with async function and maintain order', function(cb) {
			var s = istream().exec('echo ' + msg).split(' ').filterAsyncSeries(function(chunk, cb) {
				// Simulate some varying callback times
				var ms = Math.floor((Math.random()*500)+1);
				setTimeout(function() {
					cb(chunk.indexOf('e') === -1);
				}, ms);
			}).stream();
			assertStreamChunks(s, result.split(' '), true, cb);
		});
	});

	describe('chaining', function(cb) {
		it('should pipe output down a whole chain starting with a ice-stream object', function(cb) {
			var msg = 'hello there how are you';
			var stream = istream.exec('echo ' + msg);
			var s = istream(stream).exec('cat').exec('cat').exec('cat').exec('cat').stream();
			assertStreamData(s, msg + '\n', cb);
		});

		it('should pipe output down a whole chain starting with nothing', function(cb) {
			var msg = 'hello there how are you';
			var s = istream.chain().exec('echo ' + msg).exec('cat').exec('cat').exec('cat').stream();
			assertStreamData(s, msg + '\n', cb);
		});
	});
});
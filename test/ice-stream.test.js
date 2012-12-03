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

	describe('chaining', function(cb) {
		it('should pipe output down a whole chain starting with a ice-stream object', function(cb) {
			var msg = 'hello there how are you';
			var stream = istream.exec('echo ' + msg);
			var s = istream(stream).exec('cat').exec('cat').exec('cat').exec('cat').stream();
			assertStreamData(s, msg + '\n', cb);
		});
		it('should pipe output down a whole chain starting with nothing', function(cb) {
			var msg = 'hello there how are you';
			var s = istream.chain().exec('echo ' + msg).exec('cat').exec('cat').stream();
			assertStreamData(s, msg + '\n', cb);
		});
	});
});
/*global describe, it*/
var should = require('should');
var Reject = require('../lib/reject.js');

describe('Reject', function () {
	/**
	 * This function emits an array of string chunks to the stream, and then compares the outputs to given values.
	 * @param stream
	 * @param inputs
	 * @param outputs
	 * @param cb
	 */
	function testStream(stream, inputs, outputs, cb) {
		// Write the input to the stream
		for ( var i = 0; i < inputs.length; i++ )
			stream.write(inputs[i]);

		stream.end();

		var _outputs = [];

		stream.on('readable', function () {
			var chunk;
			while ( null !== (chunk = stream.read()) ) {
				_outputs.push(chunk);
			}
		});

		stream.on('end', function () {
			outputs.should.eql(_outputs);
			cb();
		});
	}

	describe('constructor', function () {
		it('should return an instance of Reject whether or not using "new"', function () {
			var stream1 = new Reject();
			stream1.should.be.an.instanceOf(Reject);

			var stream2 = Reject();
			stream2.should.be.an.instanceOf(Reject);
		});

		it('should properly set the objectMode property', function () {
			var stream = new Reject();
			stream._writableState.objectMode.should.equal(true);
		});
	});

	it('should work when returning synchronously', function (cb) {
		var stream = new Reject(function (chunk) {
			return chunk === 'b';

		});
		testStream(stream, ['a', 'b', 'c', 'b', 'a'], ['a', 'c', 'a'], cb);
	});

	it('should work when returning asynchronously', function (cb) {
		var stream = new Reject(function (chunk, cb) {

			process.nextTick(function () {
				cb(chunk === 'b');
			});
		});
		testStream(stream, ['a', 'b', 'c', 'b', 'a'], ['a', 'c', 'a'], cb);
	});
});
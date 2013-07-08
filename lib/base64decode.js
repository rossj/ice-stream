var stream = require('stream');
var newline = /(\r\n|\n|\r)/gm;

module.exports = function () {
	var transform = new stream.Transform({
		// The input is converted to strings, so no need to transform input strings to buffers
		decodeStrings : false
	});

	// Any extra chars from the last chunk
	var extra = '';

	/**
	 * Transforms a string/buffer stream of base64 data to a stream of binary buffers
	 * @param {Buffer|string} chunk
	 * @param encoding
	 * @param cb
	 * @private
	 */
	transform._transform = function (chunk, encoding, cb) {
		// Convert chunk to a string
		chunk = '' + chunk;

		// Add previous extra and remove any newline characters
		chunk = extra + chunk.replace(newline, '');

		// 4 characters represent 3 bytes, so we can only decode in groups of 4 chars
		var remaining = chunk.length % 4;

		// Store the extra chars for later
		extra = chunk.slice(chunk.length - remaining);
		chunk = chunk.slice(0, chunk.length - remaining);

		// Create the new buffer and push
		var buf = new Buffer(chunk, 'base64');
		this.push(buf);
		cb();
	};

	/**
	 * Emits 1, 2, or 3 extra characters of base64 data
	 * @param cb
	 * @private
	 */
	transform._flush = function (cb) {
		if ( !extra.length )
			return cb();

		this.push(new Buffer(extra, 'base64'));
	};

	return transform;
};

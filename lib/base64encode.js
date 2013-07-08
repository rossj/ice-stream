var stream = require('stream');

module.exports = function () {
	var transform = new stream.Transform();

	// Any extra chars from the last chunk
	var extra = null;

	/**
	 * Transforms a string/Buffer stream of binary data to a stream of base64 encoded
	 * @param {Buffer} chunk
	 * @param {string} encoding - unused since chunk is always a Buffer
	 * @param cb
	 * @private
	 */
	transform._transform = function (chunk, encoding, cb) {
		// Add any previous extra bytes to the chunk
		if ( extra ) {
			chunk = Buffer.concat([extra, chunk]);
			extra = null;
		}

		// 3 bytes are represented by 4 characters, so we can only decode in groups of 3 bytes
		var remaining = chunk.length % 3;

		if ( remaining !== 0 ) {
			// Store the extra bytes for later
			extra = chunk.slice(chunk.length - remaining);
			chunk = chunk.slice(0, chunk.length - remaining);
		}

		// Convert chunk to a base 64 string
		chunk = chunk.toString('base64');

		this.push(chunk);
		cb();
	};

	/**
	 * Emits 0 or 4 extra characters of base64 data
	 * @param cb
	 * @private
	 */
	transform._flush = function (cb) {
		if ( extra )
			this.push(extra.toString('base64'));
	};

	return transform;
};

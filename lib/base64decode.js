var stream = require('stream');
var newline = /(\r\n|\n|\r)/gm;

module.exports = function () {
	var transform = new stream.Transform();

	// Any extra chars from the last chunk
	var extra = '';

	transform._transform = function (chunk, encoding, cb) {
		// Convert chunk to a string
		chunk = ''+chunk;

		// Remove any newline characters
		chunk = extra + chunk.replace(newline, '');

		// 4 characters represent 3 bytes, so we can only decode in groups of 4 chars
		var remaining = chunk.length % 4;

		// Store the extra bytes for later
		extra = chunk.slice(chunk.length - remaining);
		chunk = chunk.slice(0, chunk.length - remaining);

		// Create the new buffer and push
		var buf = new Buffer(chunk, 'base64');
		this.push(buf);
		cb();
	};

	transform._flush = function(cb) {
		if (!extra.length)
			return cb();

		// There could be extra characters left over if the implementation does not pad witih '='
		while (extra.length < 4)
			extra += '=';

		this.push(new Buffer(extra, 'base64'));
	};

	return transform;
};

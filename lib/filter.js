module.exports = Filter;

var
// node modules
	Transform = require('stream').Transform || require('readable-stream').Transform;

require('util').inherits(Filter, Transform);

/**
 * Given an object stream, this filter will pass through chunks for which the callback returns true.
 * @param {function} check
 * @constructor
 */
function Filter(cbFilter) {
	if ( !(this instanceof Filter) )
		return new Filter(cbFilter);

	// base constructor
	Transform.call(this, { objectMode : true });

	this.cbFilter = cbFilter;
}

Filter.prototype._transform = function (chunk, encoding, cb) {
	var that = this;
	function done(keep) {
		if (keep === true)
			that.push(chunk);

		cb();
	}

	var result = this.cbFilter(chunk, done);

	// If cbFilter returned sync
	if (typeof result === 'boolean')
		done(result);
};

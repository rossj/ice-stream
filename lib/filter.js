module.exports = Filter;

var Transform = require('stream').Transform || require('readable-stream').Transform;
require('util').inherits(Filter, Transform);

/**
 * Given an object stream, this filter will pass through chunks for which the callback returns true.
 * @param {function} cbFilter
 * @constructor
 */
function Filter(cbFilter) {
	if ( !(this instanceof Filter) )
		return new Filter(cbFilter);

	// base constructor
	Transform.call(this, { objectMode: true });

	this.cbFilter = cbFilter && cbFilter.length === 1 ? function (chunk, cb) {
		cb(cbFilter(chunk));
	} : cbFilter;
}

Filter.prototype._transform = function (chunk, encoding, cb) {
	var that = this;
	this.cbFilter(chunk, function(keep) {
		if (keep)
			that.push(chunk);
		cb();
	});
};

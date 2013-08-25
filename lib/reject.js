module.exports = Reject;

var Filter = require('./filter.js');
require('util').inherits(Reject, Filter);

/**
 * Given an object stream, this filter will pass through chunks for which the callback returns false.
 * @param {function} cbReject
 * @constructor
 */
function Reject(cbReject) {
	if ( !(this instanceof Reject) )
		return new Reject(cbReject);

	// base constructor
	Filter.call(this, cbReject);

	cbReject = this.cbFilter;
	this.cbFilter = function (chunk, cb) {
		cbReject(chunk, function (reject) {
			cb(!reject);
		})
	}
}

const nock = require('nock');

const SERVER = 'http://test.viswiz.io';

function getNock() {
	return nock(SERVER, {
		reqheaders: {
			authorization: /Bearer [a-z0-9]+/,
			'user-agent': /viswiz-nodejs-sdk\/\d+/,
		},
	});
}

module.exports = getNock;
module.exports.SERVER = SERVER;

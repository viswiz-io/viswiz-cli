/* eslint no-console: 0 */

import envCI from 'env-ci';

const TEST = process.env.NODE_ENV === 'test';

export function error(msg, cmd) {
	log(msg, 'error');
	log('', 'error');

	if (cmd) {
		cmd.outputHelp();
	}
	if (!TEST) {
		process.exit(1);
	}
}

function padNumber(value, length = 2) {
	if (TEST && value < 1) {
		value = value * 100;
	}
	return value.toString().padStart(length, '0');
}

export function formatTime(time) {
	return `${padNumber(Math.floor(time / 60))}:${padNumber(time % 60)}`;
}

export function getCI() {
	const ci = envCI();

	const messageMap = {
		appveyor: 'APPVEYOR_REPO_COMMIT_MESSAGE',
		bitrise: 'BITRISE_GIT_MESSAGE',
		buildkite: 'BUILDKITE_MESSAGE',
		codeship: 'CI_MESSAGE',
		drone: 'DRONE_COMMIT_MESSAGE',
		shippable: 'COMMIT_MESSAGE',
		travis: 'TRAVIS_COMMIT_MESSAGE',
	};
	ci.message = process.env[messageMap[ci.service]];

	if (!ci.isCi) {
		ci.branch = null;
		ci.commit = null;
	}

	return ci;
}

export function log(msg, type = 'log') {
	if (TEST) {
		global.LOGS = global.LOGS || [];
		global.LOGS.push(msg);

		return msg;
	}

	console[type](msg);
}

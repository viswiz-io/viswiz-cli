/* eslint no-console: 0 */

import VisWiz from 'viswiz-sdk';
import { error, formatTime, log } from '../utils';
import * as validators from '../validators';

export const DEFAULTS = {
	POLL_SECONDS: 5,
	WAIT_SECONDS: 600,
};

async function waitForResult(client, projectID, buildID, maxTime) {
	let timeoutTimer;

	return Promise.race([
		new Promise((resolve, reject) => {
			timeoutTimer = setTimeout(
				() => reject(new Error('Waiting for results timed out!')),
				maxTime * 1000
			);
		}),
		new Promise(resolve => {
			let time = 0;

			function poll() {
				log(`Waiting for results to be ready... (${formatTime(time)}/${formatTime(maxTime)})`);

				client
					.getBuilds(projectID)
					.then(builds => {
						const build = builds.find(item => item.id === buildID);

						if (!build || !build.diffedAt) {
							return schedule();
						}

						clearTimeout(timeoutTimer);
						resolve(build.diffPercentage);
					})
					.catch(schedule);
			}

			function schedule() {
				time += DEFAULTS.POLL_SECONDS;
				setTimeout(poll, DEFAULTS.POLL_SECONDS * 1000);
			}

			poll();
		}),
	]);
}

function finalize(buildDiffPercentage, project) {
	const passed = buildDiffPercentage <= project.diffThreshold;

	log(`Build difference: ${buildDiffPercentage}%`);
	log(`Project difference threshold: ${project.diffThreshold}%`);

	if (!passed) {
		error('Build failed!');
	} else {
		log('Build passed!');
	}
}

export async function buildResult(program, options) {
	if (validators.apiKey(program) || validators.projectID(program)) {
		return;
	}

	const { apiKey, project: projectID } = program;
	let { build: buildID } = options;

	const client = new VisWiz(apiKey);

	const [project, builds] = await Promise.all([
		client.getProject(projectID),
		client.getBuilds(projectID),
	]);

	if (!builds.length) {
		return error('Error: The project does not have any builds!', program);
	}

	if (builds.length === 1) {
		log('This is the first build for this project. No comparison available.');

		return 'OK';
	}

	let build;
	if (buildID) {
		build = builds.find(item => item.id === buildID);
	} else {
		build = builds[0];
		buildID = build.id;
	}

	if (options.waitForResult) {
		const buildDiffPercentage = await waitForResult(
			client,
			projectID,
			buildID,
			typeof options.waitForResult === 'string'
				? parseInt(options.waitForResult, 10)
				: DEFAULTS.WAIT_SECONDS
		);
		log('');

		finalize(buildDiffPercentage, project);
	} else {
		finalize(build.diffPercentage, project);
	}

	return 'OK';
}

export default function configure(program) {
	program
		.command('build-result')
		.description('Gets or waits for a build result')
		.option(
			'-b, --build [buildID]',
			'The build ID to get results for. If not sent, then the most recent build for the project is used.'
		)
		.option(
			'-w, --wait-for-result [timeout]',
			'Whether to wait for the result of the build comparison (disabled by default). Waits for a maximum number of seconds (defaults to 600).'
		)
		.action((cmd, options) =>
			buildResult(program, options || cmd).catch(err => {
				error(`Error: ${err.message}`);
			})
		);
}

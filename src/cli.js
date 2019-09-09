/* eslint no-console: 0 */

import program from 'commander';
import VisWiz from 'viswiz-sdk';
import Progress from './Progress';
import { error, formatTime, getCI, log } from './utils';
import pkg from '../package.json';

const DEFAULTS = {
	POLL_SECONDS: 5,
	WAIT_SECONDS: 600,
};

async function waitForResult(client, projectID, buildID, maxTime) {
	let timeoutTimer;

	const project = await client.getProject(projectID);

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
				log(
					`Waiting for results to be ready... (${formatTime(time)}/${formatTime(
						maxTime
					)})`
				);

				client
					.getBuilds(projectID)
					.then(builds => {
						const build = builds.find(item => item.id === buildID);

						if (!build || !build.diffedAt) {
							return schedule();
						}

						clearTimeout(timeoutTimer);
						resolve(build.diffPercentage <= project.diffThreshold);
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

const commands = {
	async build(program, options) {
		const ci = getCI();

		const { apiKey, project: projectID } = program;

		if (!apiKey) {
			return error('Error: Missing API key!', program);
		}
		if (!projectID) {
			return error('Error: Missing project ID!', program);
		}
		if (!options.imageDir) {
			return error('Error: Missing image directory!', options);
		}
		if (!options.branch && !ci.branch) {
			return error('Error: Missing branch name!', options);
		}
		if (!options.message && !ci.message) {
			return error('Error: Missing commit message!', options);
		}
		if (!options.revision && !ci.commit) {
			return error('Error: Missing commit revision!', options);
		}

		const client = new VisWiz(apiKey);
		let progress;

		log('Creating build on VisWiz.io...');

		const buildID = await client.buildFolder(
			{
				branch: options.branch || ci.prBranch || ci.branch,
				name: options.message || ci.message,
				projectID,
				revision: options.revision || ci.commit,
			},
			options.imageDir,
			(current, total) => {
				if (!progress) {
					progress = new Progress(total, current);
				} else {
					progress.tick();
				}
			}
		);

		const url = `https://app.viswiz.io/projects/${projectID}/build/${buildID}/results`;

		log('Build created successfully!');
		log(`Build report will be available at: ${url}`);

		if (options.waitForResult) {
			log('');
			const passed = await waitForResult(
				client,
				projectID,
				buildID,
				typeof options.waitForResult === 'string'
					? parseInt(options.waitForResult, 10)
					: DEFAULTS.WAIT_SECONDS
			);
			log('');

			if (!passed) {
				error('Build failed!');
			} else {
				log('Build passed!');
			}
		}

		return 'OK';
	},
};

function run(argv) {
	program.version(`${pkg.version}-${process.platform}-${process.arch}`);

	program
		.option(
			'-k, --api-key [apiKey]',
			'The API key of a VisWiz account to use. Defaults to VISWIZ_API_KEY env.',
			process.env.VISWIZ_API_KEY
		)
		.option(
			'-p, --project [projectID]',
			'The ID of a VisWiz project to use. Defaults to VISWIZ_PROJECT_ID env.',
			process.env.VISWIZ_PROJECT_ID
		);

	program
		.command('build')
		.description(
			'Creates a new build on VisWiz.io and sends images for regression testing.'
		)
		.option(
			'-i, --image-dir <path>',
			'The path to a directory (scanned recursively) with images used for the build.'
		)
		.option(
			'-b, --branch [branch name]',
			'The branch name for the build. Auto-detected on popular CIs.'
		)
		.option(
			'-m, --message [commit message]',
			'The commit message for the build. Auto-detected on popular CIs.'
		)
		.option(
			'-r, --revision [rev]',
			'The revision for the build. Auto-detected on popular CIs.'
		)
		.option(
			'-w, --wait-for-result [timeout]',
			'Whether to wait for the result of the build comparison (disabled by default). Waits for a maximum number of seconds (defaults to 600).'
		)
		.action((cmd, options) =>
			commands.build(program, options || cmd).catch(err => {
				error(`Error: ${err.message}`);
			})
		);

	program.parse(argv);

	if (!program.args.length) {
		program.help();
	}
}

module.exports = {
	DEFAULTS,
	commands,
	run,
};

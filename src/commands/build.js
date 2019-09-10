/* eslint no-console: 0 */

import VisWiz from 'viswiz-sdk';
import Progress from '../Progress';
import { error, getCI, log } from '../utils';
import * as validators from '../validators';
import { buildResult } from './build-result';

export async function build(program, options) {
	if (validators.apiKey(program) || validators.projectID(program)) {
		return;
	}

	const { apiKey, project: projectID } = program;
	const ci = getCI();

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
		await buildResult(program, {
			build: buildID,
			waitForResult: options.waitForResult,
		});
	}

	return 'OK';
}

export default function configure(program) {
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
			build(program, options || cmd).catch(err => {
				error(`Error: ${err.message}`);
			})
		);
}

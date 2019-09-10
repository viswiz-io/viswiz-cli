/* eslint no-console: 0 */

import program from 'commander';
import * as commands from './commands';
import pkg from '../package.json';

export default function run(argv) {
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

	commands.build(program);
	commands.buildResult(program);

	program.parse(argv);

	if (!program.args.length) {
		program.help();
	}
}

jest.mock('../src/Progress');
jest.mock('../src/commands/build-result');

import { spawnSync } from 'child_process';
import path from 'path';
import { build } from '../src/commands/build';
import { buildResult } from '../src/commands/build-result';
import nock from '../utils/nock';
import { instances } from '../src/Progress';

const FIXTURES = path.resolve(__dirname, '..', '__fixtures__');

describe('build', () => {
	const API_KEY = 'foobar';
	const BUILD_ID = 'abcdef';
	const PROJECT_ID = 'qwerty';

	const buildPayload = {
		branch: 'master',
		name: 'Foo Bar',
		revision: 'abcdef1234567890',
	};
	const buildResponse = {
		...buildPayload,
		projectID: PROJECT_ID,
	};
	const image = {
		name: 'Foo Bar',
		originalURL: 'http://foo.com/bar.png',
		thumbURL: 'http://foo.com/bar-thumb.png',
	};

	let program;
	let cmd;

	function nockSetup() {
		return nock()
			.post(`/projects/${PROJECT_ID}/builds`, buildPayload)
			.matchHeader('Authorization', `Bearer ${API_KEY}`)
			.reply(200, {
				...buildResponse,
				id: BUILD_ID,
			})
			.post(`/builds/${BUILD_ID}/images`)
			.matchHeader('Authorization', `Bearer ${API_KEY}`)
			.reply(200, image)
			.post(`/builds/${BUILD_ID}/images`)
			.matchHeader('Authorization', `Bearer ${API_KEY}`)
			.reply(200, image)
			.post(`/builds/${BUILD_ID}/images`)
			.matchHeader('Authorization', `Bearer ${API_KEY}`)
			.reply(200, image)
			.post(`/builds/${BUILD_ID}/finish`)
			.matchHeader('Authorization', `Bearer ${API_KEY}`)
			.reply(200);
	}

	beforeEach(() => {
		program = {
			apiKey: API_KEY,
			project: PROJECT_ID,
		};
		cmd = {
			branch: buildPayload.branch,
			imageDir: FIXTURES,
			message: buildPayload.name,
			revision: buildPayload.revision,
		};

		delete process.env.CI;
		process.env.TRAVIS = true;
		process.env.TRAVIS_BRANCH = buildPayload.branch;
		process.env.TRAVIS_COMMIT = buildPayload.revision;
		process.env.TRAVIS_COMMIT_MESSAGE = buildPayload.name;
		process.env.VISWIZ_API_KEY = API_KEY;
		process.env.VISWIZ_PROJECT_ID = PROJECT_ID;
		process.env.VISWIZ_SERVER = nock.SERVER;

		if (global.LOGS) {
			global.LOGS = [];
		}
	});

	describe('build', () => {
		test('creates a build successfully, based on arguments', async () => {
			const scope = nockSetup();

			const result = await build(program, cmd);

			expect(global.LOGS).toEqual([
				'Creating build on VisWiz.io...',
				'Build created successfully!',
				'Build report will be available at: https://app.viswiz.io/projects/qwerty/build/abcdef/results',
			]);
			expect(result).toContain('OK');
			expect(instances[instances.length - 1].current).toBe(3);
			expect(instances[instances.length - 1].total).toBe(3);
			expect(scope.isDone()).toBeTruthy();
		});

		test('creates a build successfully, based on CI environment variables', async () => {
			delete cmd.branch;
			delete cmd.message;
			delete cmd.revision;
			process.env.CI = true;
			process.env.TRAVIS = true;
			process.env.TRAVIS_BRANCH = buildPayload.branch;
			process.env.TRAVIS_COMMIT = buildPayload.revision;
			process.env.TRAVIS_COMMIT_MESSAGE = buildPayload.name;

			const scope = nockSetup();

			const result = await build(program, cmd);

			expect(global.LOGS).toEqual([
				'Creating build on VisWiz.io...',
				'Build created successfully!',
				'Build report will be available at: https://app.viswiz.io/projects/qwerty/build/abcdef/results',
			]);
			expect(result).toContain('OK');
			expect(instances[instances.length - 1].current).toBe(3);
			expect(instances[instances.length - 1].total).toBe(3);
			expect(scope.isDone()).toBeTruthy();
		});

		test('wait for results', async () => {
			const scope = nockSetup();

			cmd.waitForResult = true;

			const result = await build(program, cmd);

			expect(buildResult).toHaveBeenCalledTimes(1);
			expect(buildResult).toHaveBeenCalledWith(program, {
				build: BUILD_ID,
				waitForResult: true,
			});
			expect(global.LOGS).toEqual([
				'Creating build on VisWiz.io...',
				'Build created successfully!',
				'Build report will be available at: https://app.viswiz.io/projects/qwerty/build/abcdef/results',
			]);
			expect(result).toContain('OK');
			expect(scope.isDone()).toBeTruthy();
		});

		describe('errors', () => {
			test('missing API key', async () => {
				delete process.env.NODE_ENV;
				delete process.env.VISWIZ_API_KEY;

				const result = spawnSync(
					'./bin/viswiz',
					['build', '--image-dir', '.'],
					{
						env: process.env,
					}
				);

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain('Error: Missing API key');
			});

			test('missing project ID', async () => {
				delete process.env.VISWIZ_PROJECT_ID;

				const result = spawnSync(
					'./bin/viswiz',
					['build', '--image-dir', '.'],
					{
						env: process.env,
					}
				);

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain('Error: Missing project ID');
			});

			test('missing branch name', async () => {
				delete process.env.TRAVIS_BRANCH;

				const result = spawnSync(
					'./bin/viswiz',
					['build', '--image-dir', '.'],
					{
						env: process.env,
					}
				);

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain(
					'Error: Missing branch name'
				);
			});

			test('missing image directory', async () => {
				const result = spawnSync('./bin/viswiz', ['build'], {
					env: process.env,
				});

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain(
					'Error: Missing image directory'
				);
			});

			test('missing commit message', async () => {
				delete process.env.TRAVIS_COMMIT_MESSAGE;

				const result = spawnSync(
					'./bin/viswiz',
					['build', '--image-dir', '.'],
					{
						env: process.env,
					}
				);

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain(
					'Error: Missing commit message'
				);
			});

			test('missing commit revision', async () => {
				delete process.env.TRAVIS_COMMIT;

				const result = spawnSync(
					'./bin/viswiz',
					['build', '--image-dir', '.'],
					{
						env: process.env,
					}
				);

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain(
					'Error: Missing commit revision'
				);
			});

			test('when no files are available', () => {
				const result = spawnSync(
					'./bin/viswiz',
					['build', '--image-dir', __dirname],
					{
						env: process.env,
					}
				);

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain(
					'Error: No image files found in image directory!'
				);
			});
		});
	});
});

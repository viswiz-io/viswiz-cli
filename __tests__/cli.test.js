jest.mock('../src/Progress');

import { spawnSync } from 'child_process';
import path from 'path';
import { DEFAULTS, commands } from '../src/cli';
import nock from '../utils/nock';
import { instances } from '../src/Progress';

const FIXTURES = path.resolve(__dirname, '..', '__fixtures__');

DEFAULTS.POLL_SECONDS = 0.1;

describe('cli', () => {
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

	const { build } = commands;

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
		it('creates a build successfully, based on arguments', async () => {
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

		it('creates a build successfully, based on CI environment variables', async () => {
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

		describe('wait for results', () => {
			const nockSetupResults = () =>
				nockSetup()
					.get('/projects')
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.reply(200, {
						projects: [
							{
								id: PROJECT_ID,
								diffThreshold: 0.5,
							},
						],
					});

			test('passes', async () => {
				const scope = nockSetupResults()
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.reply(200, {
						builds: [
							{
								id: 'anotherbuild',
								...buildResponse,
							},
							{
								id: BUILD_ID,
								...buildResponse,
							},
						],
					})
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.reply(200, {
						builds: [
							{
								id: 'anotherbuild',
								...buildResponse,
							},
							{
								id: BUILD_ID,
								diffedAt: new Date().toISOString(),
								diffPercentage: 0.25,
								...buildResponse,
							},
						],
					});

				cmd.waitForResult = true;

				const result = await build(program, cmd);

				expect(global.LOGS).toEqual([
					'Creating build on VisWiz.io...',
					'Build created successfully!',
					'Build report will be available at: https://app.viswiz.io/projects/qwerty/build/abcdef/results',
					'',
					'Waiting for results to be ready... (00:00/10:00)',
					'Waiting for results to be ready... (00:10/10:00)',
					'',
					'Build passed!',
				]);
				expect(result).toContain('OK');
				expect(scope.isDone()).toBeTruthy();
			});

			test('build fails', async () => {
				const scope = nockSetupResults()
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.reply(200, {
						builds: [
							{
								id: BUILD_ID,
								diffedAt: new Date().toISOString(),
								diffPercentage: 0.51,
								...buildResponse,
							},
						],
					});

				cmd.waitForResult = true;

				const result = await build(program, cmd);

				expect(global.LOGS).toEqual([
					'Creating build on VisWiz.io...',
					'Build created successfully!',
					'Build report will be available at: https://app.viswiz.io/projects/qwerty/build/abcdef/results',
					'',
					'Waiting for results to be ready... (00:00/10:00)',
					'',
					'Build failed!',
					'',
				]);
				expect(result).toContain('OK');
				expect(scope.isDone()).toBeTruthy();
			});

			test('timeout', () => {
				nockSetupResults()
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.times(10)
					.reply(200, {
						builds: [
							{
								id: BUILD_ID,
								...buildResponse,
							},
						],
					});

				cmd.waitForResult = '2';

				return expect(build(program, cmd)).rejects.toThrow(
					'Waiting for results timed out'
				);
			});
		});

		describe('errors', () => {
			it('missing API key', async () => {
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

			it('missing project ID', async () => {
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

			it('missing branch name', async () => {
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

			it('missing image directory', async () => {
				const result = spawnSync('./bin/viswiz', ['build'], {
					env: process.env,
				});

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain(
					'Error: Missing image directory'
				);
			});

			it('missing commit message', async () => {
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

			it('missing commit revision', async () => {
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

			it('when no files are available', () => {
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

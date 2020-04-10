import { spawnSync } from 'child_process';
import { buildResult, DEFAULTS } from '../src/commands/build-result';
import nock from '../utils/nock';

DEFAULTS.POLL_SECONDS = 0.1;

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
	const buildOther = {
		...buildResponse,
		id: 'other',
	};

	let program;
	let cmd;

	function nockSetup() {
		return nock()
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
	}

	beforeEach(() => {
		program = {
			apiKey: API_KEY,
			project: PROJECT_ID,
		};
		cmd = {};

		process.env.VISWIZ_API_KEY = API_KEY;
		process.env.VISWIZ_PROJECT_ID = PROJECT_ID;
		process.env.VISWIZ_SERVER = nock.SERVER;

		if (global.LOGS) {
			global.LOGS = [];
		}
	});

	describe('build-result', () => {
		describe('direct results', () => {
			test('passes, build from argument', async () => {
				const scope = nockSetup()
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.reply(200, {
						builds: [
							{
								id: BUILD_ID,
								diffPercentage: 0.25,
								...buildResponse,
							},
							buildOther,
						],
					});

				cmd.build = BUILD_ID;

				const result = await buildResult(program, cmd);

				expect(global.LOGS).toEqual([
					'Build difference: 0.25%',
					'Project difference threshold: 0.5%',
					'Build passed!',
				]);
				expect(result).toContain('OK');
				expect(scope.isDone()).toBeTruthy();
			});

			test('fails, picks last build', async () => {
				const scope = nockSetup()
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.reply(200, {
						builds: [
							{
								id: BUILD_ID,
								diffPercentage: 0.51,
								...buildResponse,
							},
							buildOther,
						],
					});

				const result = await buildResult(program, cmd);

				expect(global.LOGS).toEqual([
					'Build difference: 0.51%',
					'Project difference threshold: 0.5%',
					'Build failed!',
					'',
				]);
				expect(result).toContain('OK');
				expect(scope.isDone()).toBeTruthy();
			});

			test('passes, first build', async () => {
				const scope = nockSetup()
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.reply(200, {
						builds: [buildResponse],
					});

				const result = await buildResult(program, cmd);

				expect(global.LOGS).toEqual([
					'This is the first build for this project. No comparison available.',
				]);
				expect(result).toContain('OK');
				expect(scope.isDone()).toBeTruthy();
			});
		});

		describe('wait for results', () => {
			beforeEach(() => {
				cmd.build = BUILD_ID;
				cmd.waitForResult = true;
			});

			test('passes', async () => {
				const scope = nockSetup()
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.times(2)
					.reply(200, {
						builds: [
							{
								id: BUILD_ID,
								...buildResponse,
							},
							buildOther,
						],
					})
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.reply(200, {
						builds: [
							{
								id: BUILD_ID,
								diffedAt: new Date().toISOString(),
								diffPercentage: 0.25,
								...buildResponse,
							},
							buildOther,
						],
					});

				const result = await buildResult(program, cmd);

				expect(global.LOGS).toEqual([
					'Waiting for results to be ready... (00:00/10:00)',
					'Waiting for results to be ready... (00:10/10:00)',
					'',
					'Build difference: 0.25%',
					'Project difference threshold: 0.5%',
					'Build passed!',
				]);
				expect(result).toContain('OK');
				expect(scope.isDone()).toBeTruthy();
			});

			test('build fails', async () => {
				const scope = nockSetup()
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.times(2)
					.reply(200, {
						builds: [
							{
								id: BUILD_ID,
								diffedAt: new Date().toISOString(),
								diffPercentage: 0.51,
								...buildResponse,
							},
							buildOther,
						],
					});

				const result = await buildResult(program, cmd);

				expect(global.LOGS).toEqual([
					'Waiting for results to be ready... (00:00/10:00)',
					'',
					'Build difference: 0.51%',
					'Project difference threshold: 0.5%',
					'Build failed!',
					'',
				]);
				expect(result).toContain('OK');
				expect(scope.isDone()).toBeTruthy();
			});

			test('timeout', () => {
				nockSetup()
					.get(`/projects/${PROJECT_ID}/builds`)
					.matchHeader('Authorization', `Bearer ${API_KEY}`)
					.times(10)
					.reply(200, {
						builds: [
							{
								id: BUILD_ID,
								...buildResponse,
							},
							buildOther,
						],
					});

				cmd.waitForResult = '2';

				return expect(buildResult(program, cmd)).rejects.toThrow(
					'Waiting for results timed out'
				);
			});
		});

		describe('errors', () => {
			test('missing API key', async () => {
				delete process.env.NODE_ENV;
				delete process.env.VISWIZ_API_KEY;

				const result = spawnSync('./bin/viswiz', ['build-result'], {
					env: process.env,
				});

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain('Error: Missing API key');
			});

			test('missing project ID', async () => {
				delete process.env.VISWIZ_PROJECT_ID;

				const result = spawnSync('./bin/viswiz', ['build-result'], {
					env: process.env,
				});

				expect(result.status).toBe(1);
				expect(result.stderr.toString()).toContain('Error: Missing project ID');
			});
		});
	});
});

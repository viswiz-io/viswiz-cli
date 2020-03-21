import { spawnSync } from 'child_process';

describe('cli', () => {
	describe('help', () => {
		test('prints help without arguments', async () => {
			const result = spawnSync('./bin/viswiz', [], {
				env: process.env,
			});

			expect(result.status).toBe(1);
			expect(result.stdout.toString()).toContain('Usage: viswiz [options]');
		});
	});
});

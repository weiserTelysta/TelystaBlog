import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/admin-browser',
	outputDir: './.tmp/admin-browser-results',
	workers: 1,
	timeout: 30_000,
	use: {
		channel:
			process.env.TELYSTA_TEST_BROWSER ||
			(process.platform === 'win32' ? 'msedge' : 'chromium'),
		viewport: { width: 1440, height: 1000 },
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/browser',
	outputDir: './.tmp/browser-results',
	workers: 1,
	timeout: 30_000,
	use: {
		baseURL: 'http://127.0.0.1:4322',
		channel: process.env.TELYSTA_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : 'chromium'),
		viewport: { width: 1440, height: 1000 },
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port 4322',
		url: 'http://127.0.0.1:4322/blog/',
		reuseExistingServer: !process.env.CI,
	},
});

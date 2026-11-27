import { defineConfig } from '@playwright/test';
import { browserTestOrigin } from './scripts/browser-test-address.mjs';

export default defineConfig({
	testDir: './tests/browser',
	outputDir: './.tmp/browser-results',
	workers: 1,
	timeout: 30_000,
	use: {
		baseURL: browserTestOrigin,
		channel: process.env.TELYSTA_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : 'chromium'),
		viewport: { width: 1440, height: 1000 },
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'node scripts/browser-preview.mjs',
		url: `${browserTestOrigin}/blog/`,
		reuseExistingServer: false,
	},
});

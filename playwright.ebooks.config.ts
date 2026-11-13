import { defineConfig } from '@playwright/test';
export default defineConfig({
	testDir: './tests/ebooks-browser', outputDir: './.tmp/ebooks-browser-results', workers: 1,
	use: { baseURL: 'http://127.0.0.1:4325', channel: process.env.TELYSTA_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : 'chromium'), screenshot: 'only-on-failure', trace: 'retain-on-failure' },
	webServer: { command: 'node scripts/ebooks-browser-preview.mjs', url: 'http://127.0.0.1:4325/ebooks/', timeout: 120_000, reuseExistingServer: false },
});

export const browserTestPort = Number(process.env.TELYSTA_BROWSER_TEST_PORT ?? 4322);
if (!Number.isInteger(browserTestPort) || browserTestPort < 1 || browserTestPort > 65535) {
	throw new Error('TELYSTA_BROWSER_TEST_PORT must be a valid TCP port.');
}

export const browserTestOrigin = `http://127.0.0.1:${browserTestPort}`;

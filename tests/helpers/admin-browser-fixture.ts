import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Run through tsx, matching npm run admin rather than Playwright's TS transform. */
export async function adminBrowserFixture() {
	const child = fork(
		fileURLToPath(new URL('./admin-browser-worker.ts', import.meta.url)),
		[],
		{ execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
	);
	let output = '';
	child.stderr?.on('data', (chunk) => {
		output += chunk.toString();
	});
	const data = await new Promise<{
		url: string;
		root: string;
		relative: string;
	}>((resolve, reject) => {
		const timer = setTimeout(() => {
			child.kill();
			reject(new Error('Fixture startup timeout: ' + output));
		}, 15_000);
		child.once('error', (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.once('exit', (code) => {
			clearTimeout(timer);
			reject(new Error(`Fixture exited ${code}: ${output}`));
		});
		child.once('message', (value) => {
			clearTimeout(timer);
			resolve(value as typeof data);
		});
	});
	return {
		...data,
		async close() {
			await new Promise<void>((resolve, reject) => {
				child.once('exit', (code) =>
					code === 0
						? resolve()
						: reject(new Error(`Fixture cleanup failed: ${output}`)),
				);
				child.send('close');
			});
		},
	};
}

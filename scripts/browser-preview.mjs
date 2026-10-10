import { preview } from 'astro';

// Keep the server in Playwright's process tree, including agent environments
// where the Astro CLI automatically launches a detached background server.
const server = await preview({
	server: { host: '127.0.0.1', port: 4322 },
	vite: { preview: { strictPort: true } },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.once(signal, async () => {
		await server.stop();
		process.exit(0);
	});
}

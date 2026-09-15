import { adminFixture } from './admin-fixture';
const fixture = await adminFixture();
process.send?.({
	url: fixture.url,
	root: fixture.root,
	relative: fixture.relative,
});
let closing = false;
async function close() {
	if (closing) return;
	closing = true;
	try {
		await fixture.close();
		process.exit(0);
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
}
process.on('message', (message) => {
	if (message === 'close') void close();
});
process.on('disconnect', () => void close());

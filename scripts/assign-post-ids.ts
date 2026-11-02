import { assignPostIds } from './lib/post-identity';

try {
	const changed = await assignPostIds(process.cwd());
	console.log(`已为 ${changed.length} 篇文章保存短 UUID；既有编号未改动。`);
} catch (error) {
	console.error(String(error));
	process.exitCode = 1;
}

import { build, preview } from 'astro';
import { writeFile, unlink, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

// Temporary real content exercises production rendering without publishing fake books.
const outDir = fileURLToPath(new URL('../.tmp/ebooks-browser-dist/', import.meta.url));
const files = [];
const cleanup = async () => { for (const file of files) await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; }); };
let server;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await cleanup(); await server?.stop(); process.exit(0); });
try {
	// Isolate fixture output from the author's real imported library.
	process.env.TELYSTA_EBOOK_FIXTURES_ONLY = '1';
	for (let i = 1; i <= 9; i++) {
		const id = `test-ebook-${i}`;
		const file = fileURLToPath(new URL(`../src/content/ebooks/__browser_fixture_${i}.md`, import.meta.url));
		await access(file).then(() => { throw new Error(`Refusing to overwrite ${file}`); }, error => { if (error.code !== 'ENOENT') throw error; });
		const data = {
			id, title: i === 1 ? '一本拥有很长中文标题的电子书：跨越文明与时间的阅读' : `测试书目 ${i}`,
			authors: i === 1 ? ['第一位作者', '另一位拥有较长名字的作者'] : ['测试作者'],
			description: '仅用于浏览器回归的书目。', language: '中文', draft: i === 9,
			cover: `https://assets.telysta.com/ebooks/${id}/cover.webp`,
			files: ['EPUB', 'PDF'].map(format => ({ format, href: `https://assets.telysta.com/ebooks/${id}/v1/book.${format.toLowerCase()}` })),
		};
		files.push(file);
		await writeFile(file, `---\n${stringify(data)}---\n\n## 书籍介绍\n\n这段文字属于测试书目。\n`);
	}
	await build({ outDir, logLevel: 'warn' });
	await cleanup();
	server = await preview({ outDir, server: { host: '127.0.0.1', port: 4325 }, vite: { preview: { strictPort: true } } });
} catch (error) { await cleanup(); throw error; }

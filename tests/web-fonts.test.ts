import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collectFontCharacters, prepareWebFonts } from '../scripts/web-fonts.mjs';

test('字体收集识别直接文字、Unicode 转义与 HTML 数字实体', () => {
	const characters = collectFontCharacters(['龘\\u9F98\\u{9F98}&#x9F98;&#40856;']);
	assert.equal([...characters].filter(char => char === '龘').length, 1);
	assert.ok(characters.includes('0') && characters.includes('Z'));
});

test('新字自动进入下一次字体构建，缓存可复用且完整原字体不变', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'telysta-fonts-'));
	try {
		await mkdir(path.join(root, 'src/config/pages'), { recursive: true });
		await cp('src/assets/fonts', path.join(root, 'src/assets/fonts'), { recursive: true });
		await writeFile(path.join(root, 'package-lock.json'), '{}');
		const contentFile = path.join(root, 'src/config/pages/home.ts');
		await writeFile(contentFile, 'Hello 世界');
		const before = await readFile(path.join(root, 'src/assets/fonts/LXGWWenKaiLite-Regular.ttf'));
		const first = (await prepareWebFonts(root))[0];
		const firstPath = path.join(root, '.astro/web-fonts', first.file);
		const time = (await stat(firstPath)).mtimeMs;
		assert.equal((await prepareWebFonts(root))[0].file, first.file);
		assert.equal((await stat(firstPath)).mtimeMs, time);
		await writeFile(contentFile, 'Hello 世界 龘');
		const second = (await prepareWebFonts(root))[0];
		assert.notEqual(second.file, first.file);
		// Inspect the actual cmap with the subsetter's own binary toolchain.
		const require = createRequire(import.meta.url);
		const fontRequire = createRequire(require.resolve('subset-font'));
		const fontverter = fontRequire('fontverter');
		const hb = await import(pathToFileURL(fontRequire.resolve('harfbuzzjs')).href);
		async function codepoints(file: string) {
			const woff = await readFile(path.join(root, '.astro/web-fonts', file));
			assert.equal(woff.toString('ascii', 0, 4), 'wOF2');
			const ttf = await fontverter.convert(woff, 'truetype');
			return new Set(new hb.Face(new hb.Blob(ttf)).collectUnicodes());
		}
		assert.equal((await codepoints(first.file)).has('龘'.codePointAt(0)), false);
		assert.equal((await codepoints(second.file)).has('龘'.codePointAt(0)), true);
		assert.deepEqual(await readFile(path.join(root, 'src/assets/fonts/LXGWWenKaiLite-Regular.ttf')), before);
	} finally { await rm(root, { recursive: true, force: true }); }
});

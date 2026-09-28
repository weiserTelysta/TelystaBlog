import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';

test('清单生成只收录图片，嵌套 UI 集合不会重复进入插画前缀', async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'telysta-cdn-policy-'));
	try {
		const source = path.join(root, 'images');
		const avatars = path.join(source, 'TelystaAssets', 'avatars');
		await fs.mkdir(avatars, { recursive: true });
		const png = await sharp({ create: { width: 4, height: 6, channels: 3, background: '#d8dee9' } }).png().toBuffer();
		await fs.writeFile(path.join(source, 'drawing.PNG'), png);
		await sharp(png).webp().toFile(path.join(source, 'drawing.webp'));
		await fs.writeFile(path.join(source, 'drawing.PSD'), 'private layered document');
		await fs.writeFile(path.join(source, 'drawing.ai'), 'private vector document');
		await fs.writeFile(path.join(source, 'secret.txt'), 'not an image');
		await fs.writeFile(path.join(avatars, 'face.png'), png);
		const output = path.join(root, 'manifest.json');
		execFileSync(process.execPath, ['scripts/generate-cdn-manifest.mjs', '--source', source,
			'--collection', `avatars=${avatars}`, '--without-covers', '--output', output]);
		const manifest = JSON.parse(await fs.readFile(output, 'utf8'));
		assert.deepEqual(Object.keys(manifest.assets).sort(), ['avatars/face', 'drawing']);
		assert.equal(manifest.assets.drawing.original.path, 'telysta-images/drawing.PNG');
		assert.equal(manifest.assets.drawing.display.width, 4);
		assert.equal(manifest.assets['avatars/face'].original.path, 'avatars/face.png');
		assert.doesNotMatch(JSON.stringify(manifest), /\.psd|\.ai|secret|TelystaAssets/i);
		assert.deepEqual(manifest.assets.drawing.sources, []);
	} finally {
		const resolved = path.resolve(root);
		if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + 'telysta-cdn-policy-')) throw new Error('Unsafe test cleanup path');
		await fs.rm(resolved, { recursive: true, force: true });
	}
});

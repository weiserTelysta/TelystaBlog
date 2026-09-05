import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeCovers, sha256 } from '../scripts/lib/cdn-covers.mjs';

const input = Buffer.from('original');
const source = { path: 'telysta-images/test.png', bytes: input.length, format: 'PNG' };
const cover = { path: `covers/test.${sha256('cover')}.webp`, bytes: 5, width: 960, height: 640, format: 'WEBP' };
const index = { version: 1, assets: { test: { source, sourceHash: sha256(input), cover } } };

test('独立封面合并不改变高清图、原图和下载源', async () => {
	const asset = { original: source, display: { path: 'telysta-images/test.webp' }, sources: [] };
	const before = structuredClone(asset);
	await mergeCovers({ test: asset }, index, async () => input);
	assert.deepEqual(asset, { ...before, cover });
});

test('原图改名、同体积内容变更或清单缺项时拒绝沿用旧封面', async () => {
	await assert.rejects(() => mergeCovers({}, index), /source changed/);
	await assert.rejects(() => mergeCovers({ test: { original: { ...source, path: 'new.png' } } }, index), /source changed/);
	await assert.rejects(() => mergeCovers({ test: { original: source } }, index, async () => Buffer.from('modified')), /content changed/);
});

test('封面只接受 covers 下的内容版本化路径', async () => {
	await assert.rejects(() => mergeCovers({ test: { original: source } }, {
		...index, assets: { test: { ...index.assets.test, cover: { ...cover, path: 'test.webp' } } },
	}), /Invalid versioned/);
});

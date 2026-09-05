import assert from 'node:assert/strict';
import test from 'node:test';
import { reserveCdnImageSpace } from '../scripts/rehype-cdn-images.mjs';

const manifest = { origin: 'https://assets.telysta.com/', assets: {
	portrait: { display: { path: 'telysta-images/画 稿.webp', width: 1600, height: 3200 } },
} };
const image = (properties: Record<string, unknown>) => ({ type: 'element', tagName: 'img', properties });

test('从清单为 URL 图片预留比例，处理编码路径和查询参数', () => {
	const node = image({ src: 'https://assets.telysta.com/telysta-images/%E7%94%BB%20%E7%A8%BF.webp?v=1' });
	reserveCdnImageSpace({ children: [node] }, manifest);
	assert.equal(node.properties.width, 1600);
	assert.equal(node.properties.height, 3200);
	assert.equal(node.properties.decoding, 'async');
	assert.equal(node.properties.loading, 'eager');
});

test('保留作者尺寸与加载策略，只补缺失比例，未知来源不猜尺寸', () => {
	const url = 'https://assets.telysta.com/telysta-images/画 稿.webp';
	const nodes = [image({ src: url, width: 400 }), image({ src: url, width: 80, height: 90, loading: 'eager' }), image({ src: 'https://example.test/unlisted.webp' }), image({ src: './local.png' })];
	reserveCdnImageSpace({ children: nodes }, manifest);
	assert.equal(nodes[0].properties.height, 800);
	assert.equal(nodes[1].properties.height, 90);
	assert.equal(nodes[1].properties.loading, 'eager');
	assert.equal(nodes[2].properties.width, undefined);
	assert.equal(nodes[2].properties.loading, 'lazy');
	assert.equal(nodes[3].properties.width, undefined);
});

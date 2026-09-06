import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveShareImage } from '../src/lib/shareMetadata';
import { SITE_CONFIG } from '../src/config/site';

const site = new URL('https://telysta.com');
test('分享图使用固定站点头像，文章封面转换绝对 URL，不伪造尺寸', () => {
	assert.deepEqual(resolveShareImage(undefined, site), SITE_CONFIG.shareImage);
	assert.deepEqual(resolveShareImage('/images/封面.png', site, '文章封面'), {
		url: new URL('/images/封面.png', site).href, alt: '文章封面',
	});
	assert.equal(resolveShareImage('https://assets.telysta.com/cover.webp', site).url, 'https://assets.telysta.com/cover.webp');
});
test('无效或未解析的封面回退，不输出相对文件路径和非 HTTP 图片', () => {
	for (const value of ['', './cover.png', 'asset:example', 'javascript:alert(1)', 'https://', 'https://user:pass@example.com/a.png']) {
		assert.deepEqual(resolveShareImage(value, site), SITE_CONFIG.shareImage);
	}
});

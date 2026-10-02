import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStructuredData, serializeStructuredData } from '../src/lib/structuredData';
import { resolveCanonicalUrl } from '../src/lib/shareMetadata';

const base = { site: new URL('https://telysta.com'), pathname: '/about/', title: 'About', description: 'About Weiser', image: 'https://assets.telysta.com/reference.webp' };
test('canonical 统一尾斜杠并清除查询与片段，不要求路由强制拒绝旧链接', () => {
	assert.equal(resolveCanonicalUrl('/blog?from=share#records', base.site), 'https://telysta.com/blog/');
	assert.equal(resolveCanonicalUrl('/', base.site), 'https://telysta.com/');
});
test('About 与文章结构化数据连接真实作者、正文标题和日期', () => {
	const about = buildStructuredData(base)['@graph'];
	assert.equal(about[2]['@type'], 'AboutPage');
	assert.equal(about[1].url, 'https://telysta.com/about/');
	const article = buildStructuredData({ ...base, pathname: '/blog/test/', article: { title: '正文标题', publishedAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-03'), tags: ['design'] } });
	const post = article['@graph'].find(node => node['@type'] === 'BlogPosting');
	assert.ok(post && 'headline' in post);
	assert.equal(post.headline, '正文标题');
	assert.equal(post.dateModified, '2026-09-03T00:00:00.000Z');
});
test('JSON-LD 可以还原原文且不能被文章文本关闭 script', () => {
	const data = { text: '</script><script>alert(1)</script>\u2028\u2029' };
	const json = serializeStructuredData(data);
	assert.ok(!json.includes('<'));
	assert.deepEqual(JSON.parse(json), data);
});

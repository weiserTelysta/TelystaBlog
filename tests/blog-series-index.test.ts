import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Blog 入口提供系列总索引，系列页从统一配置自动生成', async () => {
	const [navigation, seriesIndex] = await Promise.all([
		readFile(new URL('../src/components/blog/BlogNavigationPage.astro', import.meta.url), 'utf8'),
		readFile(new URL('../src/pages/series/index.astro', import.meta.url), 'utf8'),
	]);

	assert.match(navigation, /BlogSeriesIndexLink/);
	assert.match(seriesIndex, /BLOG_SERIES\.map/);
	assert.match(seriesIndex, /BLOG_CATEGORIES\.map/);
	assert.match(seriesIndex, /series\.category === category\.id/);
	assert.match(seriesIndex, /postCount > 0/);
	assert.match(seriesIndex, /getPostsBySeries/);
	assert.match(seriesIndex, /href=\{buildSeriesHref\(item\.id\)\}/);
});

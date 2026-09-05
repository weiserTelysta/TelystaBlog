import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readProjectFile = (relativePath: string) => readFile(
	new URL(`../${relativePath}`, import.meta.url),
	'utf8',
);

test('Giscus 使用固定的文章评论配置并保持外部脚本不经 Astro 打包', async () => {
	const component = await readProjectFile('src/components/article/ArticleComments.astro');

	assert.match(component, /<script\s+is:inline\s+src="https:\/\/giscus\.app\/client\.js"/);
	assert.match(component, /data-repo="weiserTelysta\/telysta-blog-comments"/);
	assert.match(component, /data-repo-id="R_kgDOUOgjrA"/);
	assert.match(component, /data-category-id="DIC_kwDOUOgjrM4DE4hf"/);
	assert.match(component, /data-mapping="pathname"/);
	assert.match(component, /data-theme="preferred_color_scheme"/);
	assert.match(component, /data-lang="zh-CN"/);
	assert.match(component, /data-loading="lazy"/);
});

test('评论组件只由博客文章路由引入，并位于正文和系列导航之后', async () => {
	const articlePage = await readProjectFile('src/pages/blog/[...slug].astro');
	const nonArticlePages = await Promise.all([
		readProjectFile('src/pages/index.astro'),
		readProjectFile('src/pages/blog.astro'),
		readProjectFile('src/pages/resources.astro'),
		readProjectFile('src/pages/series/[series].astro'),
	]);

	const contentIndex = articlePage.indexOf('<Content />');
	const seriesIndex = articlePage.indexOf('<ArticleSeriesNav');
	const commentsIndex = articlePage.indexOf('<ArticleComments />');

	assert.ok(contentIndex >= 0);
	assert.ok(seriesIndex > contentIndex);
	assert.ok(commentsIndex > seriesIndex);
	assert.ok(nonArticlePages.every((page) => !page.includes('ArticleComments')));
});

test('评论区与系列入口复用文章正文宽度，不创建独立全屏容器', async () => {
	const articlePage = await readProjectFile('src/pages/blog/[...slug].astro');
	const comments = await readProjectFile('src/components/article/ArticleComments.astro');
	const series = await readProjectFile('src/components/article/ArticleSeriesNav.astro');

	assert.match(articlePage, /<div class="article-page__body">[\s\S]*<ArticleSeriesNav[\s\S]*<ArticleComments \/>[\s\S]*<\/div>/);
	assert.match(comments, /\.article-comments\s*\{[\s\S]*width:\s*100%/);
	assert.doesNotMatch(comments, /Discussion|在这里留下回应/);
	assert.doesNotMatch(series, /series\.description|viewLabel/);
	assert.ok(series.indexOf('<strong>') < series.indexOf('article-series__count'));
	assert.doesNotMatch(series, /ARTICLE_PAGE_CONFIG|article-series__meta/);
	assert.doesNotMatch(series, /article-series__signal/);
	assert.doesNotMatch(series, /radial-gradient|linear-gradient|pointermove|series-pointer|scaleX/);
	assert.match(series, /prefers-reduced-motion: reduce/);
});

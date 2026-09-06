import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BLOG_CATEGORIES, BLOG_CATEGORY_IDS } from '../src/config/content/blogCategories';
import { BLOG_SERIES, BLOG_SERIES_IDS } from '../src/config/content/blogSeries';
import { RESOURCE_GALLERY_CONFIG } from '../src/config/content/resourceGallery';
import { isPublicIllustration } from '../src/lib/resources/resourceDisplayPolicy';
import { HOME_GREETINGS } from '../src/config/pages/homeGreetings';
import { HOME_PROFILES } from '../src/config/pages/homeProfiles';
import { BLOG_PAGE_CONFIG } from '../src/config/pages/blog';
import { RESOURCE_PAGE_CONFIG } from '../src/config/pages/resources';
import { ARTICLE_PAGE_CONFIG } from '../src/config/pages/article';

test('栏目与系列 ID 从资料派生，唯一且关联有效', () => {
	assert.deepEqual(BLOG_CATEGORY_IDS, BLOG_CATEGORIES.map(item => item.id));
	assert.deepEqual(BLOG_SERIES_IDS, BLOG_SERIES.map(item => item.id));
	for (const list of [BLOG_CATEGORIES, BLOG_SERIES]) {
		assert.ok(list.length > 0);
		assert.equal(new Set(list.map(item => item.id)).size, list.length);
		for (const item of list) {
			assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
			assert.ok(item.title.trim());
		}
	}
	for (const series of BLOG_SERIES) assert.ok(BLOG_CATEGORY_IDS.includes(series.category));
});

test('可编辑提示非空，动态文案保留必要占位符', () => {
	for (const copy of [BLOG_PAGE_CONFIG.search, RESOURCE_PAGE_CONFIG.viewer, RESOURCE_PAGE_CONFIG.download, ARTICLE_PAGE_CONFIG.codeCopy]) {
		for (const value of Object.values(copy)) assert.ok(value.trim());
	}
	assert.ok(BLOG_PAGE_CONFIG.search.resultCount.includes('{count}'));
	assert.ok(BLOG_PAGE_CONFIG.search.limited.includes('{limit}'));
	assert.ok(RESOURCE_PAGE_CONFIG.download.imageLabel.includes('{index}'));
});

test('首页句子与角色允许扩充，校验 ID、权重和时间偏好而非条数', () => {
	for (const entries of [HOME_GREETINGS, HOME_PROFILES]) {
		assert.ok(entries.length > 0);
		assert.equal(new Set(entries.map(item => item.id)).size, entries.length);
		for (const item of entries) assert.ok(Number.isFinite(item.weight ?? 1) && (item.weight ?? 1) >= 0);
	}
	assert.ok(HOME_PROFILES.some(item => item.enabled !== false));
	assert.ok(HOME_GREETINGS.some(item => (item.weight ?? 1) > 0));
	for (const item of HOME_GREETINGS) {
		assert.ok(item.text.trim());
		assert.ok(Number.isFinite(item.dayAffinity) && item.dayAffinity >= 0 && item.dayAffinity <= 1);
	}
});

test('画廊收录名单不绕过草稿与保护规则', () => {
	const featured = RESOURCE_GALLERY_CONFIG.featuredImages;
	assert.equal(new Set(featured).size, featured.length);
	for (const image of featured) {
		assert.match(image, /^asset:/);
		assert.doesNotMatch(image, /^asset:(characters|avatars|blog_imgs)\//i);
		assert.ok(isPublicIllustration({ type: 'image', image, status: 'available' }));
		assert.equal(isPublicIllustration({ type: 'image', image, status: 'draft' }), false);
		assert.equal(isPublicIllustration({ type: 'image', image, status: 'available', draft: true }), false);
	}
	assert.equal(isPublicIllustration({ type: 'illustration', image: 'asset:avatars/private', status: 'available' }), false);
});

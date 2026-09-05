import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGalleryWheel } from '../src/lib/resources/galleryWheel';
import { searchPosts, searchSnippet, matchRanges, type SearchPost } from '../src/lib/blogSearch';
import { TAB_GREETINGS } from '../src/config/tabGreetings';
import fs from 'node:fs';
import { HOME_PROFILES } from '../src/config/pages/homeProfiles';

test('滚轮归一化、阈值、连续惯性只切一张，停顿后重新响应', () => {
	const step = createGalleryWheel();
	assert.equal(step(10, 0, 0), 0);
	assert.equal(step(45, 0, 20), 1);
	for (let now = 40; now < 1000; now += 20) assert.equal(step(100, 0, now), 0);
	assert.equal(step(-3, 1, 1300), -1);
	assert.equal(step(1, 2, 1700), 1);
});

const post: SearchPost = { title: 'Telysta 的设计', description: '角色介绍', body: '红色巨龙与国家责任', href: '/blog/example/', category: 'Portraits', tags: ['人物'], series: 'Telysta 札记' };
test('搜索中文全文、多个关键词、标签与系列，标题结果优先', () => {
	assert.equal(searchPosts([post], '巨龙 责任').length, 1);
	assert.equal(searchPosts([post], '人物').length, 1);
	assert.equal(searchPosts([post], '札记').length, 1);
	assert.equal(searchPosts([post], '不存在').length, 0);
	assert.equal(searchPosts([post], ' ').length, 0);
	assert.equal(searchPosts([{ ...post, title: 'Other', body: 'telysta' }, post], 'TELYSTA')[0].title, post.title);
	assert.equal(searchPosts([{ ...post, title: 'Café' }], 'cafe').length, 1);
});

test('所有角色有本地 32/48 PNG，祝福覆盖多种语言', () => {
	for (const profile of HOME_PROFILES) for (const size of [32, 48]) {
		const data = fs.readFileSync(`public/favicons/${profile.id}-${size}.png`);
		assert.equal(data.readUInt32BE(16), size);
		assert.equal(data.readUInt32BE(20), size);
	}
	assert.equal(TAB_GREETINGS.length, 9);
});

test('结果摘要截取真正命中句，而非文章开头；重音与重叠词高亮位置准确', () => {
	const sample = { ...post, description: '这只是开头介绍。', body: '开头无关内容。'.repeat(30) + '她的家族与红色巨龙有着深刻的渊源。' + '后面无关的段落。'.repeat(20) };
	const snippet = searchSnippet(sample, '巨龙');
	assert.match(snippet, /她的家族与红色巨龙有着深刻的渊源/);
	assert.ok(snippet.length < 160);
	assert.ok(!snippet.includes('开头介绍'));
	assert.deepEqual(matchRanges('Café 与 café', 'cafe'), [[0, 4], [7, 11]]);
	assert.deepEqual(matchRanges('Telysta', 'tely telysta'), [[0, 7]]);
	assert.match(searchSnippet(post, '人物'), /人物/);
	assert.equal(searchSnippet({ ...post, title: '仅标题命中', body: '文章正文没有对应词。' }, '仅标题'), '角色介绍');
});

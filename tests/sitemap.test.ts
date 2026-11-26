import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDiscoverablePath, sitemapXml } from '../scripts/sitemap.mjs';
test('单一站点地图去重、转义URL，不包含被过滤的后台与受保护地址', () => {
 const output = sitemapXml('https://telysta.com', ['','blog/','blog/','console/','ebooks/private/','about/?q=a&b=c'], path => !['/console/','/ebooks/private/'].includes(path));
 assert.equal((output.match(/<url>/g)||[]).length,3);
 assert.ok(output.includes('https://telysta.com/blog/'));
 assert.ok(output.includes('&amp;b=c'));
 assert.ok(!output.includes('/console/') && !output.includes('/ebooks/private/'));
});

test('只从指定入口和文章路由生成站点地图', () => {
 for (const route of ['/', '/blog/', '/ebooks/', '/blog/WEISER012345abcdef/', '/series/my-journal/']) {
  assert.equal(isDiscoverablePath(route), true, route);
 }
 for (const route of ['/console/', '/ebooks/WEISER012345abcdef/', '/ebooks/read/', '/ebooks/page/2/', '/ebooks/booklists/J238/', '/blog/reading/旧地址/', '/blog/search-index.json', '/rss.xml']) {
  assert.equal(isDiscoverablePath(route), false, route);
 }
});

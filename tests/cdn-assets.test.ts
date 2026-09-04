import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	buildCdnAssetUrl,
	getCdnAsset,
	isCdnAssetReference,
	isCdnAssetUrl,
} from '../src/lib/cdnAssets';

test('解析 CDN 资源清单中的展示图、原图和源文件', () => {
	const asset = getCdnAsset('asset:Alice/alice_illustration');

	assert.ok(asset?.display);
	assert.equal(asset.original?.format, 'PNG');
	assert.equal(asset.sources[0]?.format, 'PSD');
	assert.ok(asset.display.width > 0);
	assert.ok(asset.display.height > 0);
});

test('CDN URL 对路径片段编码并保持自定义域名', () => {
	const asset = getCdnAsset('asset:Rhaelysa/rhaelysa&telysta_librarystaircase_01');

	assert.ok(asset?.display);
	const url = buildCdnAssetUrl(asset.display);

	assert.equal(
		url,
		'https://assets.telysta.com/telysta-images/Rhaelysa/rhaelysa%26telysta_librarystaircase_01.webp',
	);
	assert.equal(isCdnAssetUrl(url), true);
	assert.equal(isCdnAssetReference('asset:Rhaelysa/example'), true);
});

test('Character 使用独立的 CDN 封面、预览和原图', () => {
	const asset = getCdnAsset('asset:characters/all the magic rune');

	assert.ok(asset?.cover);
	assert.ok(asset.display);
	assert.equal(asset.original?.format, 'PNG');
	assert.equal(
		buildCdnAssetUrl(asset.cover),
		'https://assets.telysta.com/characters/all%20the%20magic%20rune.cover.webp',
	);
	assert.equal(
		buildCdnAssetUrl(asset.display),
		'https://assets.telysta.com/characters/all%20the%20magic%20rune.preview.webp',
	);
});

test('首页头像由 avatars 前缀提供', () => {
	const asset = getCdnAsset('asset:avatars/Profile_Alice_01');

	assert.ok(asset?.display);
	assert.equal(
		buildCdnAssetUrl(asset.display),
		'https://assets.telysta.com/avatars/Profile_Alice_01.avatar.webp',
	);
});

test('新增的 Art Nouveau 首页头像包含 CDN 展示图和原图', () => {
	const asset = getCdnAsset('asset:avatars/Profile_Weiser_artnouveau');

	assert.equal(
		asset?.display && buildCdnAssetUrl(asset.display),
		'https://assets.telysta.com/avatars/Profile_Weiser_artnouveau.avatar.webp',
	);
	assert.equal(asset?.original?.path, 'avatars/Profile_Weiser_artnouveau.png');
});

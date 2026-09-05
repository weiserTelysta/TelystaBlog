import assert from 'node:assert/strict';
import test from 'node:test';
import {
	isPublicResourceDownload,
	isPublicResourceFormat,
} from '../src/lib/resources/resourceDownloadPolicy';

test('PSD 源文件不会进入公开下载列表', () => {
	assert.equal(isPublicResourceFormat('PSD'), false);
	assert.equal(
		isPublicResourceDownload({
			format: 'FILE',
			href: 'https://assets.telysta.com/source/artwork.PSD?version=2',
		}),
		false,
	);
});

test('公开图片和压缩包仍可下载', () => {
	assert.equal(isPublicResourceFormat('PNG'), true);
	assert.equal(
		isPublicResourceDownload({
			format: 'PNG',
			href: 'https://assets.telysta.com/image/artwork.png',
		}),
		true,
	);
	assert.equal(isPublicResourceDownload({ format: 'ZIP', href: '/files/archive.zip' }), true);
});

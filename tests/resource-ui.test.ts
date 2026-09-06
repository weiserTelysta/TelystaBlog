import { RESOURCE_PAGE_CONFIG } from '../src/config/pages/resources';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Window } from 'happy-dom';
import ResourceExplorer from '../src/components/resources/ResourceExplorer';
import { getLightboxDownloads, getLightboxSlides } from '../src/lib/resources/resourceLightboxData';
import { isPublicIllustration } from '../src/lib/resources/resourceDisplayPolicy';
import type { ResourceListItem } from '../src/lib/resources/resourceItems';

function fixture(): ResourceListItem {
	return {
		id: 'illustration', title: '插画与差分',
		type: 'illustration', cover: 'https://example.test/cover.webp',
		coverAspectRatio: 2, pixelArt: false, preview: 'https://example.test/image-0.webp',
		gallery: Array.from({ length: 7 }, (_, index) => ({
			src: `https://example.test/image-${index}.webp`, width: 2400, height: 1200,
			aspectRatio: 2, alt: `差分 ${index + 1}`,
		})),
		downloadFiles: [
			...Array.from({ length: 7 }, (_, sourceIndex) => ({
				kind: 'remote-file' as const, label: `差分 ${sourceIndex + 1}`,
				href: `https://example.test/image-${sourceIndex}.png`, format: 'PNG', sourceIndex,
			})),
			{ kind: 'remote-file', label: '源文件', href: 'https://example.test/original.psd', format: 'PSD' },
			{ kind: 'external', label: '作者网站', href: 'https://example.test/artist', format: 'PAGE' },
		],
	};
}

test('服务端即输出完整图片入口，无脚本仍能访问原始预览', async () => {
	const resource = fixture();
	const html = renderToStaticMarkup(createElement(ResourceExplorer, { resources: [resource] }));
	const dom = new Window();
	try {
		dom.document.body.innerHTML = html;
		const link = dom.document.querySelector('.resource-card');
		assert.equal(link?.getAttribute('href'), resource.preview);
		assert.equal(link?.getAttribute('aria-label'), `查看资源：${resource.title}`);
		assert.equal(link?.querySelector('img')?.getAttribute('src'), resource.cover);
		assert.equal(link?.textContent, '');
	} finally { await dom.happyDOM.abort(); }
});

test('同组七张图完整保留顺序和原图下载，但不提供 PSD 或作者页面', () => {
	const resource = fixture();
	assert.deepEqual(getLightboxDownloads(resource).map((file) => file.label),
		Array.from({ length: 7 }, (_, index) => `差分 ${index + 1}`));
	const slides = getLightboxSlides(resource);
	assert.equal(slides.length, 7);
	assert.deepEqual(slides[6], { src: resource.gallery[6].src, width: 2400, height: 1200, alt: '差分 7' });
});

test('共享 CDN 中的 Character、头像、茶花文章配图以及草稿不进入插画页', () => {
	const illustration = { type: 'illustration', image: 'asset:Telysta/painting', status: 'available' };
	assert.equal(isPublicIllustration(illustration), true);
	for (const image of ['asset:characters/Telysta', 'asset:avatars/telysta', 'asset:blog_imgs/telysta_chidan']) {
		assert.equal(isPublicIllustration({ ...illustration, image }), false);
	}
	assert.equal(isPublicIllustration({ ...illustration, draft: true }), false);
	assert.equal(isPublicIllustration({ ...illustration, status: 'draft' }), false);
	assert.equal(isPublicIllustration({ ...illustration, type: 'image' }), false);
	for (const image of ['asset:archive/Minecraft_red', 'asset:archive/minecraft_yellow']) {
		assert.equal(isPublicIllustration({ ...illustration, type: 'image', image }), true);
		assert.equal(isPublicIllustration({ ...illustration, type: 'image', image, draft: true }), false);
	}
});

test('全屏看图、切换第七张、下载选择、分层关闭和焦点返回形成完整流程', async () => {
	const dom = new Window({ url: 'https://telysta.com/resources', width: 1200, height: 800 });
	const replacements: Record<string, unknown> = {
		window: dom, document: dom.document, navigator: dom.navigator,
		Element: dom.Element, HTMLElement: dom.HTMLElement, Node: dom.Node,
		HTMLImageElement: dom.HTMLImageElement, AbortController: dom.AbortController,
		requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
		cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
	};
	const originals = new Map<string, PropertyDescriptor | undefined>();
	for (const [key, value] of Object.entries(replacements)) {
		originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
		Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
	}
	// DOM 生命周期检查，不代替真实浏览器中的渲染与触摸验收。
	const nativeMatchMedia = dom.matchMedia.bind(dom);
	dom.matchMedia = (query) => {
		const media = nativeMatchMedia(query);
		Object.defineProperty(media, 'matches', { value: true });
		return media;
	};
	let viewer: ReturnType<typeof import('../src/components/resources/resourceLightbox').openResourceLightbox> | undefined;
	try {
		const { openResourceLightbox } = await import('../src/components/resources/resourceLightbox');
		dom.document.body.innerHTML = '<a id="trigger" href="https://example.test/cover.webp">作品</a>';
		const trigger = dom.document.querySelector('#trigger')!;
		let destroyed = 0;
		viewer = openResourceLightbox(fixture(), trigger as unknown as HTMLAnchorElement, () => { destroyed++; });
		assert.equal(dom.document.body.style.overflow, 'hidden');
		assert.ok(dom.document.querySelector('.pswp[role="dialog"]'));
		for (let index = 0; index < 6; index++) {
			dom.document.querySelector<InstanceType<typeof dom.HTMLButtonElement>>(`[aria-label="${RESOURCE_PAGE_CONFIG.viewer.nextLabel}"]`)!.click();
		}
		assert.equal(viewer.currIndex, 6);
		assert.equal(dom.document.querySelector('#resource-lightbox-title')?.textContent, '插画与差分 · 7 / 7');
		const root = dom.document.querySelector('.pswp')!;
		root.dispatchEvent(new dom.PointerEvent('pointerleave', { pointerType: 'mouse' }));
		assert.ok(root.querySelector('.resource-viewer-frame')?.classList.contains('is-idle'));
		dom.document.dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		assert.equal(viewer.currIndex, 5);
		assert.ok(!root.querySelector('.resource-viewer-frame')?.classList.contains('is-idle'));
		dom.document.dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		dom.document.querySelector<InstanceType<typeof dom.HTMLButtonElement>>(`[aria-label="${RESOURCE_PAGE_CONFIG.viewer.downloadLabel}"]`)!.click();
		const dialog = dom.document.querySelector('dialog')!;
		assert.equal(dialog.open, true);
		const links = dialog.querySelectorAll('a');
		assert.equal(links.length, 7);
		assert.equal(links[6].href, 'https://example.test/image-6.png');
		assert.equal(links[6].getAttribute('aria-current'), 'true');
		dom.document.dispatchEvent(new dom.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		assert.equal(destroyed, 0, '下载对话框打开时，Escape 不得关闭底层看图器');
		dialog.dispatchEvent(new dom.Event('cancel', { cancelable: true }));
		assert.equal(dialog.open, false);
		assert.equal(destroyed, 0);
		assert.equal(dom.document.activeElement?.getAttribute('aria-label'), RESOURCE_PAGE_CONFIG.viewer.downloadLabel);
		const closed = new Promise<void>((resolve) => viewer!.on('destroy', () => resolve()));
		dom.document.querySelector<InstanceType<typeof dom.HTMLButtonElement>>(`[aria-label="${RESOURCE_PAGE_CONFIG.viewer.closeLabel}"]`)!.click();
		await closed;
		assert.equal(destroyed, 1);
		assert.equal(dom.document.querySelector('.pswp'), null);
		assert.equal(dom.document.body.style.overflow, '');
		assert.equal(dom.document.activeElement, trigger);
	} finally {
		viewer?.destroy();
		await dom.happyDOM.abort();
		for (const [key, descriptor] of originals) {
			if (descriptor) Object.defineProperty(globalThis, key, descriptor);
			else Reflect.deleteProperty(globalThis, key);
		}
	}
});

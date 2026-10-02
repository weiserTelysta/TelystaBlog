import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Window } from 'happy-dom';
import { lockPageScroll, unlockPageScroll, scrollToTarget, scrollToTop } from '../src/lib/scrollRuntime';

test('原生导航遵守减少动态、立即定位与嵌套滚动锁', () => {
	const previousWindow = globalThis.window;
	const previousDocument = globalThis.document;
	const browser = new Window();
	const calls: ScrollToOptions[] = [];
	let reduced = false;
	Object.assign(globalThis, { window: browser, document: browser.document });
	Object.assign(browser, {
		scrollTo: (options: ScrollToOptions) => calls.push(options),
		matchMedia: () => ({ matches: reduced }),
	});
	try {
		scrollToTarget(500, { offset: -50 });
		assert.deepEqual(calls.at(-1), { top: 450, behavior: 'smooth' });
		reduced = true;
		scrollToTop();
		assert.deepEqual(calls.at(-1), { top: 0, behavior: 'instant' });
		reduced = false;
		scrollToTarget(200, { immediate: true });
		assert.equal(calls.at(-1)?.behavior, 'instant');
		lockPageScroll();
		lockPageScroll();
		const count = calls.length;
		unlockPageScroll();
		scrollToTarget(800);
		assert.equal(calls.length, count);
		assert.ok(browser.document.documentElement.classList.contains('is-page-scroll-locked'));
		unlockPageScroll();
		assert.ok(!browser.document.documentElement.classList.contains('is-page-scroll-locked'));
		scrollToTarget(800);
		assert.equal(calls.at(-1)?.top, 800);
	} finally {
		unlockPageScroll();
		unlockPageScroll();
		Object.assign(globalThis, { window: previousWindow, document: previousDocument });
		browser.happyDOM.abort();
	}
});

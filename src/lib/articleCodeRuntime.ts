import { ARTICLE_PAGE_CONFIG } from '../config/pages/article';

const ENHANCED_ATTRIBUTE = 'data-code-block-enhanced';
const COPY_ICON = `
	<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
		<rect x="8" y="8" width="11" height="11" rx="2"></rect>
		<path d="M16 8V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h1"></path>
	</svg>`;
const COPIED_ICON = `
	<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
		<path d="m6.5 12.5 3.5 3.5 7.5-8"></path>
	</svg>`;
const ERROR_ICON = `
	<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
		<path d="m8 8 8 8M16 8l-8 8"></path>
	</svg>`;

type CopyState = 'idle' | 'copied' | 'error';

function setCopyState(
	button: HTMLButtonElement,
	status: HTMLElement,
	state: CopyState,
) {
	const label = ARTICLE_PAGE_CONFIG.codeCopy[state];
	button.dataset.state = state;
	button.setAttribute('aria-label', label);
	button.title = label;
	button.innerHTML =
		state === 'copied' ? COPIED_ICON : state === 'error' ? ERROR_ICON : COPY_ICON;
	status.textContent = state === 'idle' ? '' : label;
}

async function copyText(text: string) {
	if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
	await navigator.clipboard.writeText(text);
}

function enhanceCodeBlock(pre: HTMLPreElement) {
	if (pre.hasAttribute(ENHANCED_ATTRIBUTE) || pre.closest('.music-score__text')) return;

	const code = pre.querySelector<HTMLElement>('code');
	if (!code) return;

	pre.setAttribute(ENHANCED_ATTRIBUTE, 'true');
	const wrapper = document.createElement('div');
	wrapper.className = 'code-block';

	const copyButton = document.createElement('button');
	copyButton.className = 'code-block__copy';
	copyButton.type = 'button';
	const copyStatus = document.createElement('span');
	copyStatus.className = 'code-block__status';
	copyStatus.setAttribute('role', 'status');
	copyStatus.setAttribute('aria-live', 'polite');
	setCopyState(copyButton, copyStatus, 'idle');

	let resetTimer = 0;
	copyButton.addEventListener('click', async () => {
		window.clearTimeout(resetTimer);
		try {
			await copyText(code.textContent ?? '');
			setCopyState(copyButton, copyStatus, 'copied');
		} catch {
			setCopyState(copyButton, copyStatus, 'error');
		}
		resetTimer = window.setTimeout(() => {
			setCopyState(copyButton, copyStatus, 'idle');
		}, 1800);
	});

	pre.before(wrapper);
	wrapper.append(pre, copyButton, copyStatus);
}

export const initArticleCodeRuntime = () => {
	document
		.querySelectorAll<HTMLPreElement>('[data-article-content] pre')
		.forEach(enhanceCodeBlock);
};

declare global {
	interface Window {
		__telystaArticleCodeRuntimeBound?: boolean;
	}
}

export const bindArticleCodeRuntime = () => {
	if (window.__telystaArticleCodeRuntimeBound) return;
	window.__telystaArticleCodeRuntimeBound = true;
	document.addEventListener('astro:page-load', initArticleCodeRuntime);
};

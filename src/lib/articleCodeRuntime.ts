const ENHANCED_ATTRIBUTE = 'data-code-block-enhanced';

function getLanguage(pre: HTMLPreElement, code: HTMLElement) {
	const languageClass = Array.from(code.classList).find((className) =>
		className.startsWith('language-'),
	);
	return pre.dataset.language || languageClass?.slice('language-'.length) || 'text';
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
	const toolbar = document.createElement('div');
	toolbar.className = 'code-block__toolbar';

	const language = document.createElement('span');
	language.className = 'code-block__language';
	language.textContent = getLanguage(pre, code);

	const copyButton = document.createElement('button');
	copyButton.className = 'code-block__copy';
	copyButton.type = 'button';
	copyButton.textContent = '复制';
	copyButton.setAttribute('aria-label', '复制代码');

	let resetTimer = 0;
	copyButton.addEventListener('click', async () => {
		window.clearTimeout(resetTimer);
		try {
			await copyText(code.textContent ?? '');
			copyButton.dataset.state = 'copied';
			copyButton.textContent = '已复制';
		} catch {
			copyButton.dataset.state = 'error';
			copyButton.textContent = '复制失败';
		}
		resetTimer = window.setTimeout(() => {
			delete copyButton.dataset.state;
			copyButton.textContent = '复制';
		}, 1800);
	});

	pre.before(wrapper);
	wrapper.append(toolbar, pre);
	toolbar.append(language, copyButton);
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

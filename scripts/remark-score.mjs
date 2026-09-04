import path from 'node:path';

import { readGeneratedScore } from './lib/score-utils.mjs';

function escapeHtml(value) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function decorateSvg(svg) {
	return svg.replace(
		'<svg ',
		'<svg class="music-score__svg" aria-hidden="true" focusable="false" ',
	);
}

function scoreFigure(id, bundle) {
	const { parsed, svg } = bundle;
	const titleId = `music-score-${id}-title`;
	const musicalMeta = [parsed.key ? `1 = ${parsed.key}` : '', parsed.meter]
		.filter(Boolean)
		.join(' · ');
	const textFallback = [
		musicalMeta,
		parsed.music,
		...parsed.lyrics.map((lyrics) => lyrics),
	]
		.filter(Boolean)
		.join('\n\n');

	return `<figure class="music-score" aria-labelledby="${titleId}">
	<div class="music-score__header">
		<p class="music-score__eyebrow">数字简谱 · ${escapeHtml(parsed.title)}</p>
		<h3 class="music-score__sr-title" id="${titleId}">${escapeHtml(parsed.title)}</h3>
		<p class="music-score__hint"><span aria-hidden="true">↔</span> 横向拖动查看</p>
	</div>
	<div class="music-score__viewport" data-lenis-prevent data-scroll-native tabindex="0" aria-label="${escapeHtml(`${parsed.title}简谱，可横向滚动查看`)}">
		${decorateSvg(svg)}
	</div>
	<details class="music-score__text">
		<summary>查看文字简谱</summary>
		<pre><code>${escapeHtml(textFallback)}</code></pre>
	</details>
</figure>`;
}

export default function remarkScore() {
	return async function transform(tree) {
		const scoreNodes = [];

		function collect(node, parent) {
			if (!node || typeof node !== 'object') return;
			if (node.type === 'code' && node.lang === 'score' && parent) {
				scoreNodes.push({ node, parent });
			}
			if (Array.isArray(node.children)) {
				for (const child of node.children) collect(child, node);
			}
		}

		collect(tree, null);
		for (const { node, parent } of scoreNodes) {
			const id = node.value.trim();
			let bundle;
			try {
				bundle = await readGeneratedScore(process.cwd(), id);
			} catch (error) {
				throw new Error(
					`Unable to render score block "${id}" in ${path.basename(process.cwd())}: ${error.message}`,
				);
			}
			const index = parent.children.indexOf(node);
			parent.children[index] = { type: 'html', value: scoreFigure(id, bundle) };
		}
	};
}

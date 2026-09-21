import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Root as MdRoot } from 'mdast';
import type { Root as HtmlRoot, Element } from 'hast';
import { splitMarkdownSource } from '../../src/lib/markdownSource';
import remarkArticleTitle from '../remark-article-title.mjs';
import remarkPostLinks from '../remark-post-links.mjs';
import { extractMarkdownTitle } from '../../src/lib/markdownTitle';

const escape = (text: string) =>
	text.replace(
		/[&<>"']/g,
		(c) =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
				c
			]!,
	);
function inertHtml() {
	return (tree: MdRoot) => {
		function visit(node: { children?: unknown[] }) {
			if (!node.children) return;
			node.children = node.children.map((child) => {
				const value = child as {
					type: string;
					value?: string;
					children?: unknown[];
				};
				if (value.type === 'html')
					return { type: 'code', lang: 'html', value: value.value };
				visit(value);
				return value;
			});
		}
		visit(tree);
	};
}

export async function renderPostPreview(
	source: string,
	title: string,
	nonce: string,
	resolveImage: (source: string) => Promise<string | undefined>,
) {
	const processor = await createMarkdownProcessor({
		syntaxHighlight: false,
		remarkPlugins: [remarkArticleTitle, [remarkPostLinks, { preview: true }], inertHtml, remarkMath],
		rehypePlugins: [
			[rehypeKatex, { output: 'mathml', trust: false }],
			function previewElements() {
				return async (tree: HtmlRoot, file) => {
					async function visit(node: HtmlRoot | Element) {
						for (const child of node.children) {
							if (child.type !== 'element') continue;
							if (child.tagName === 'a') {
								delete child.properties.href;
								delete child.properties.target;
							}
							if (child.tagName === 'img') {
								const src = await resolveImage(
									String(child.properties.src ?? ''),
								);
								if (src)
									child.properties = {
										src,
										alt: String(child.properties.alt ?? ''),
										loading: 'lazy',
									};
								else {
									child.tagName = 'span';
									child.children = [
										{
											type: 'text',
											value: `图片未预览：${child.properties.alt ?? child.properties.src ?? ''}`,
										},
									];
									child.properties = {};
								}
							}
							await visit(child);
						}
					}
					await visit(tree);
					if (file.data.astro) {
						file.data.astro.localImagePaths = [];
						file.data.astro.remoteImagePaths = [];
					}
				};
			},
		],
	});
	const body = splitMarkdownSource(source).body;
	const { code } = await processor.render(body, {
		frontmatter: { category: 'preview' },
	});
	title = extractMarkdownTitle(body) || title;
	const css = `:root{color-scheme:dark;font-family:system-ui,sans-serif;color:#d8dee9;background:#0b1019}body{max-width:760px;margin:0 auto;padding:24px;line-height:1.9;overflow-wrap:anywhere}h1{font-size:26px}h2{font-size:22px;margin-top:2em}h3{font-size:19px}a{color:#9cc7e8}img{max-width:100%;height:auto}pre{overflow:auto;background:#080c13;padding:16px;white-space:pre;font-size:14px;line-height:1.6}code{font-family:Consolas,monospace}blockquote{border-left:2px solid #47617a;margin-left:0;padding-left:20px;color:#aebccb}table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}th,td{border:1px solid #354252;padding:8px}math[display=block]{display:block;overflow:auto;margin:1.5em 0}input{pointer-events:none}`;
	return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https://assets.telysta.com data:; style-src 'nonce-${nonce}'; form-action 'none'; base-uri 'none'"><meta name="referrer" content="no-referrer"><title>文章预览</title><style nonce="${nonce}">${css}</style></head><body><h1>${escape(title)}</h1>${code}</body></html>`;
}

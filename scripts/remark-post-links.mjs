import wikiLink from 'remark-wiki-link';
import { readPostLinkIndex } from './lib/post-link-index.mjs';
import { resolveWikiLink } from '../src/lib/postLinks.mjs';

/** Micromark handles tokenization, escapes and code; this layer owns site resolution. */
export default function remarkPostLinks(options = {}) {
	wikiLink.call(this, { aliasDivider: '|', pageResolver: name => [name] });
	return (tree, file) => {
		if (options.preview || file.data.astro?.frontmatter?.draft === true) return;
		const index = options.index ?? readPostLinkIndex(options.root);
		function visit(node, parent) {
			if (node.type === 'wikiLink') {
				try {
					if (parent?.type === 'link' || parent?.type === 'linkReference') throw new Error('WikiLink 不能嵌套在另一个链接中。');
					// Anchor and transclusion syntax are deliberately not guessed.
					if (node.value.includes('#')) throw new Error('WikiLink 暂不支持 #章节；请使用普通 Markdown 锚点链接。');
					const url = resolveWikiLink(index, node.value);
					Object.assign(node, { type: 'link', url, children: [{ type: 'text', value: node.data.alias }] });
					delete node.data;
					delete node.value;
				} catch (error) {
					file.fail(error.message, node, 'telysta:wikilink');
				}
			}
			for (const child of node.children ?? []) visit(child, node);
		}
		visit(tree);
	};
}

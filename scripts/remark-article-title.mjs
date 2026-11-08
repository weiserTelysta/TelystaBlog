/**
 * Keep one visible article title in the site header. An explicit frontmatter
 * title takes precedence; a Markdown H1 supplies the title when it is omitted.
 */
export default function remarkArticleTitle() {
	return (tree, file) => {
		const frontmatter = file.data.astro?.frontmatter;
		const isPostFile = /(?:^|\/)src\/content\/weiser-posts\//.test(String(file.path ?? '').replace(/\\/g, '/'));

		if (!frontmatter || (typeof frontmatter.category !== 'string' && !isPostFile)) return;

		const headingIndex = tree.children.findIndex(
			(node) => node.type === 'heading' && node.depth === 1,
		);

		if (headingIndex < 0) return;

		const heading = tree.children[headingIndex];
		frontmatter.articleTitle = typeof frontmatter.title === 'string' && frontmatter.title.trim()
			? frontmatter.title.trim()
			: readText(heading).trim();
		tree.children.splice(headingIndex, 1);
	};
}

function readText(node) {
	if (!node || typeof node !== 'object') return '';
	if (typeof node.value === 'string') return node.value;
	if (typeof node.alt === 'string') return node.alt;
	if (!Array.isArray(node.children)) return '';
	return node.children.map(readText).join('');
}

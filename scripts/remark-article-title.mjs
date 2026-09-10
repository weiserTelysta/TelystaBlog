/**
 * Treat the first Markdown H1 as the authored article title while keeping the
 * site header responsible for its final visual placement beside cover/meta.
 * Content validation guarantees that published posts contain exactly one H1
 * and that it matches frontmatter.title.
 */
export default function remarkArticleTitle() {
	return (tree, file) => {
		const frontmatter = file.data.astro?.frontmatter;

		if (!frontmatter || typeof frontmatter.category !== 'string') return;

		const headingIndex = tree.children.findIndex(
			(node) => node.type === 'heading' && node.depth === 1,
		);

		if (headingIndex < 0) return;

		const heading = tree.children[headingIndex];
		frontmatter.articleTitle = readText(heading).trim();
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

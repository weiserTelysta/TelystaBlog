export type ArticleHeading = {
	depth: number;
	slug: string;
	text: string;
};

export type ArticleTocNode = ArticleHeading & {
	children: ArticleTocNode[];
};

/** Builds a semantic outline by nesting each heading under its nearest shallower predecessor. */
export function buildArticleTocTree(headings: ArticleHeading[]): ArticleTocNode[] {
	const roots: ArticleTocNode[] = [];
	const ancestors: ArticleTocNode[] = [];

	for (const heading of headings) {
		while (ancestors.length > 0 && ancestors.at(-1)!.depth >= heading.depth) {
			ancestors.pop();
		}

		const node: ArticleTocNode = {
			...heading,
			children: [],
		};
		const parent = ancestors.at(-1);

		if (parent) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}

		ancestors.push(node);
	}

	return roots;
}

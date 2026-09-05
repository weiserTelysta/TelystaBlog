export type SearchPost = { href: string; title: string; description: string; category: string; tags: string[]; series: string; body: string };
export const normalizeSearch = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();

export function searchPosts(posts: SearchPost[], query: string): SearchPost[] {
	const terms = normalizeSearch(query).slice(0, 160).split(' ').filter(Boolean);
	if (!terms.length) return [];
	return posts.map(post => {
		const title = normalizeSearch(post.title);
		const metadata = normalizeSearch([post.description, post.category, post.series, ...post.tags].join(' '));
		const body = normalizeSearch(post.body);
		const score = terms.every(term => `${title} ${metadata} ${body}`.includes(term))
			? terms.reduce((sum, term) => sum + (title.includes(term) ? 10 : metadata.includes(term) ? 3 : 1), 0) : 0;
		return { post, score };
	}).filter(item => item.score > 0).sort((a, b) => b.score - a.score).map(item => item.post);
}

export function searchBody(markdown: string): string {
	return markdown.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[#*`~>|]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchRanges(text: string, query: string): Array<[number, number]> {
	let normalized = '';
	const starts: number[] = [], ends: number[] = [];
	let offset = 0;
	for (const character of text) {
		const plain = character.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
		for (let i = 0; i < plain.length; i++) { starts.push(offset); ends.push(offset + character.length); }
		normalized += plain; offset += character.length;
	}
	const ranges: Array<[number, number]> = [];
	for (const term of normalizeSearch(query).slice(0, 160).split(' ').filter(Boolean)) {
		let from = 0, found: number;
		while ((found = normalized.indexOf(term, from)) !== -1) {
			ranges.push([starts[found], ends[found + term.length - 1]]); from = found + term.length;
		}
	}
	const merged: Array<[number, number]> = [];
	for (const range of ranges.sort((a, b) => a[0] - b[0])) {
		const previous = merged.at(-1);
		if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
		else merged.push([...range]);
	}
	return merged;
}

export function searchSnippet(post: SearchPost, query: string): string {
	// Prefer the actual matched body sentence, never the unrelated opening excerpt.
	const candidates = [post.body, post.description, [post.category, post.series, ...post.tags].join(' · ')];
	const text = candidates.find(text => matchRanges(text, query).length) ?? post.description;
	const hit = matchRanges(text, query)[0] ?? [0, 0];
	let start = 0, end = text.length;
	for (const boundary of text.matchAll(/[。！？.!?\n]/g)) {
		if (boundary.index < hit[0]) start = boundary.index + 1;
		else if (boundary.index >= hit[1]) { end = boundary.index + 1; break; }
	}
	if (end - start > 140) {
		start = Math.max(start, hit[0] - 24);
		end = Math.min(end, Math.max(hit[1], start + 140));
	}
	return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

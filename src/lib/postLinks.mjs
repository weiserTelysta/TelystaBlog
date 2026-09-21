import { slug as githubSlug } from 'github-slugger';

export const normalizeLinkName = value => value.normalize('NFKC').trim().toLowerCase();

/** Match Astro's historical file-based IDs, independently of frontmatter.slug. */
export function legacyPostId(file) {
	return file.replace(/\\/g, '/').replace(/\.md$/i, '').split('/').map(segment => githubSlug(segment)).join('/').replace(/\/index$/, '');
}

export function postHref(id) {
	return `/blog/${id}/`;
}

export function postLinkErrors(data) {
	const errors = [];
	const validAlias = alias => typeof alias === 'string'
		&& Boolean(alias.trim()) && !/[\[\]|#\r\n]/.test(alias.normalize('NFKC'));
	if (data.aliases !== undefined && (!Array.isArray(data.aliases) || !data.aliases.every(validAlias))) {
		errors.push('aliases 必须是非空名称列表，不能包含 []、|、# 或换行。');
	}
	return errors;
}

/** All aliases are explicit; never guess a filename or silently pick a duplicate. */
export function createPostLinkIndex(posts) {
	const names = new Map();
	const routes = new Map();
	for (const post of posts) {
		const errors = postLinkErrors(post.data);
		if (errors.length) throw new Error(`${post.file}: ${errors.join(' ')}`);
		post.href = postHref(post.id);
		const previousRoute = routes.get(post.href);
		if (previousRoute && previousRoute.file !== post.file) throw new Error(`文章地址重复 ${post.href}: ${previousRoute.file} / ${post.file}`);
		routes.set(post.href, post);
		const aliases = post.data.aliases ?? [];
		for (const alias of aliases) {
			const name = normalizeLinkName(alias);
			const previous = names.get(name);
			if (previous && previous.file !== post.file) throw new Error(`WikiLink 名称重复「${alias}」: ${previous.file} / ${post.file}`);
			names.set(name, post);
		}
	}
	return { posts, names, routes };
}

export function resolveWikiLink(index, target) {
	const post = index.names.get(normalizeLinkName(target));
	if (!post) throw new Error(`WikiLink「${target}」没有对应文章；请为目标文章填写 aliases。`);
	if (post.data.draft === true) throw new Error(`WikiLink「${target}」指向未发布草稿。`);
	return post.href;
}

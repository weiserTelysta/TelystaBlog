import { slug as githubSlug } from 'github-slugger';
import { postCategoryForDirectory } from './postPaths.mjs';

export const normalizeLinkName = value => value.normalize('NFKC').trim().toLowerCase();
export const POST_UUID_PATTERN = /^[0-9a-f]{12}$/;

/** The saved random ID, never a hash of a title or filename. */
export function postRouteId(data) {
	if (typeof data.uuid !== 'string' || !POST_UUID_PATTERN.test(data.uuid)) {
		throw new Error('uuid 必须是固定的 12 位小写十六进制编号；请运行 npm run post:identify。');
	}
	return `WEISER${data.uuid}`;
}

/** Match Astro's historical file-based IDs, independently of frontmatter.slug. */
export function legacyPostId(file) {
	const segments = file.replace(/\\/g, '/').replace(/\.md$/i, '').split('/');
	segments[0] = postCategoryForDirectory(segments[0].toLowerCase());
	return segments.map(segment => githubSlug(segment)).join('/').replace(/\/index$/, '');
}

export function postHref(id) {
	return `/blog/${id}/`;
}

export function postLinkErrors(data) {
	const errors = [];
	try { postRouteId(data); } catch (error) { errors.push(error.message); }
	const validAlias = alias => typeof alias === 'string'
		&& Boolean(alias.trim()) && !/[\[\]|#\r\n]/.test(alias.normalize('NFKC'));
	if (data.aliases !== undefined && (!Array.isArray(data.aliases) || !data.aliases.every(validAlias))) {
		errors.push('aliases 必须是非空名称列表，不能包含 []、|、# 或换行。');
	}
	const validOldPath = value => typeof value === 'string'
		&& /^\/blog\/(?!category\/)[^?#\s\\]+\/$/.test(value)
		&& !value.split('/').some(segment => ['.', '..'].includes(segment))
		&& !/%|[<>"']/.test(value);
	if (data.redirectFrom !== undefined && (!Array.isArray(data.redirectFrom) || !data.redirectFrom.every(validOldPath))) {
		errors.push('redirectFrom 必须是 /blog/.../ 格式的站内旧文章地址列表。');
	}
	if (data.commentId !== undefined && (typeof data.commentId !== 'string' || !data.commentId.trim())) {
		errors.push('commentId 必须是非空的固定评论标识。');
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
		post.id = postRouteId(post.data);
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
	const index = { posts, names, routes };
	buildPostRedirects(index);
	return index;
}

/** Flatten saved and current filename URLs directly to each published permalink. */
export function buildPostRedirects(index) {
	/** @type {Record<string, string>} */
	const redirects = {};
	const owners = new Map();
	for (const post of index.posts) {
		const oldPaths = [post.legacyHref, ...(post.data.redirectFrom ?? [])].filter(Boolean);
		for (const oldPath of oldPaths) {
			if (oldPath === post.href) continue;
			const owner = owners.get(oldPath) ?? index.routes.get(oldPath);
			if (owner && owner.file !== post.file) throw new Error(`文章旧地址冲突 ${oldPath}: ${owner.file} / ${post.file}`);
			owners.set(oldPath, post);
			if (post.data.draft !== true) redirects[oldPath] = post.href;
		}
	}
	return redirects;
}

export function resolveWikiLink(index, target) {
	const post = index.names.get(normalizeLinkName(target));
	if (!post) throw new Error(`WikiLink「${target}」没有对应文章；请为目标文章填写 aliases。`);
	if (post.data.draft === true) throw new Error(`WikiLink「${target}」指向未发布草稿。`);
	return post.href;
}

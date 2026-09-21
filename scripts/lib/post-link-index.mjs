import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { createPostLinkIndex, legacyPostId } from '../../src/lib/postLinks.mjs';

export function readPostLinkIndex(root = process.cwd()) {
	const base = path.join(root, 'src/content/weiser-posts');
	const posts = [];
	function scan(dir) {
		if (!fs.existsSync(dir)) return;
		for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
			const file = path.join(dir, entry.name);
			if (entry.isDirectory()) scan(file);
			else if (entry.isFile() && entry.name.endsWith('.md')) {
				const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
				const match = /^---\n(?:([\s\S]*?)\n)?---(?:\n|$)/.exec(source);
				const data = match ? parse(match[1] ?? '') ?? {} : {};
				if (typeof data !== 'object' || Array.isArray(data)) throw new Error(`${file}: frontmatter 必须是对象。`);
				const relative = path.relative(base, file).replace(/\\/g, '/');
				data.category = String(data.category || relative.split('/')[0]).trim().toLowerCase();
				posts.push({ id: legacyPostId(relative), file, data, body: match ? source.slice(match[0].length) : source });
			}
		}
	}
	scan(base);
	const index = createPostLinkIndex(posts);
	// Aliases, draft state and file moves must invalidate referring posts.
	const digest = createHash('sha256').update(JSON.stringify(posts.map(({ id, data }) => ({ id, data })))).digest('hex');
	return { ...index, digest };
}

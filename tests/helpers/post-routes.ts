import { readPostLinkIndex } from '../../scripts/lib/post-link-index.mjs';
import { buildPostRedirects } from '../../src/lib/postLinks.mjs';

const redirects = buildPostRedirects(readPostLinkIndex());
export function permalinkFor(oldPath: string): string {
	const permalink = redirects[oldPath];
	if (!permalink) throw new Error(`Missing legacy article route: ${oldPath}`);
	return permalink;
}

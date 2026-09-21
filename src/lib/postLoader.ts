import { readFile } from 'node:fs/promises';
import { glob, type Loader } from 'astro/loaders';
import { splitMarkdownSource } from './markdownSource';
import { completePostMetadata, needsPostBody } from './postMetadata';
import cdnManifest from '../generated/cdn-assets.json';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { legacyPostId } from './postLinks.mjs';
import { readPostLinkIndex } from '../../scripts/lib/post-link-index.mjs';

const POST_RENDER_VERSION = 4;

/** Keep Astro's Markdown rendering, relative assets, IDs and dev watcher. */
export function postLoader(): Loader {
	const loader = glob({ pattern: '**/*.md', base: './src/content/weiser-posts', generateId: ({ entry }) => legacyPostId(entry) });
	let removeWatcher: (() => void) | undefined;
	return {
		name: 'telysta-post-loader',
		async load(context) {
			removeWatcher?.();
			const root = fileURLToPath(context.config.root);
			// Rendered Markdown contains CDN dimensions. A manifest-only update must
			// invalidate Astro's cached HTML even when the article text is unchanged.
			const imageManifestDigest = context.generateDigest(cdnManifest);
			async function sync() {
				const linkDigest = readPostLinkIndex(root).digest;
				await loader.load({
					...context,
					watcher: undefined,
					// Bump the render version when metadata or Markdown rules change.
					generateDigest: (data) => context.generateDigest({ version: POST_RENDER_VERSION, imageManifestDigest, linkDigest, data }),
					async parseData(options) {
						const body = options.filePath && needsPostBody(options.data)
							? splitMarkdownSource(await readFile(options.filePath, 'utf8')).body
							: '';
						const data = completePostMetadata(options.data, body, options.filePath ?? options.id);
						return context.parseData({
							...options,
							data: data as typeof options.data,
						});
					},
				});
			}
			await sync();
			if (context.watcher) {
				// Resync referring posts as well as the edited target; serialize rapid saves.
				let pending = Promise.resolve();
				const onChange = (event: string, file: string) => {
					const relative = path.relative(path.join(root, 'src/content/weiser-posts'), file);
					if (!['add', 'change', 'unlink'].includes(event) || relative.startsWith('..') || path.isAbsolute(relative) || !relative.endsWith('.md')) return;
					pending = pending.then(sync).catch(error => context.logger.error(String(error)));
				};
				context.watcher.on('all', onChange);
				removeWatcher = () => { context.watcher?.off('all', onChange); };
			}
		},
	};
}

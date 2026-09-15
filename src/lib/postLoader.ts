import { readFile } from 'node:fs/promises';
import { glob, type Loader } from 'astro/loaders';
import { splitMarkdownSource } from './markdownSource';
import { completePostMetadata, needsPostBody } from './postMetadata';

const POST_METADATA_VERSION = 3;

/** Keep Astro's Markdown rendering, relative assets, IDs and dev watcher. */
export function postLoader(): Loader {
	const loader = glob({ pattern: '**/*.md', base: './src/content/weiser-posts' });
	return {
		name: 'telysta-post-loader',
		async load(context) {
			await loader.load({
				...context,
				// Invalidate cached metadata when the completion rules change.
				generateDigest: (data) => context.generateDigest({ version: POST_METADATA_VERSION, data }),
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
		},
	};
}

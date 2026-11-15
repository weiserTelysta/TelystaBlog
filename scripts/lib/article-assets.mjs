import fs from 'node:fs/promises';
import path from 'node:path';

/** Per-article inventories survive regeneration of the shared CDN manifest. */
export async function readArticleAssets(rootDirectory) {
	const directory = path.join(rootDirectory, 'data/blog-assets');
	const names = await fs.readdir(directory).catch(error => {
		if (error.code === 'ENOENT') return [];
		throw error;
	});
	const assets = {};
	const prefixes = new Set();
	for (const name of names.filter(value => value.endsWith('.json')).sort()) {
		const inventory = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
		if (inventory.version !== 1 || !/^WEISER[0-9a-f]{12}$/.test(inventory.postId)
			|| name !== `${inventory.postId}.json` || inventory.bucket !== 'telysta-blog-assets'
			|| !/^blog_imgs\/[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(inventory.prefix)
			|| prefixes.has(inventory.prefix) || !Array.isArray(inventory.files)) {
			throw new Error(`Invalid article asset inventory: ${name}`);
		}
		prefixes.add(inventory.prefix);
		for (const file of inventory.files) {
			if (!/^[a-z0-9][a-z0-9_-]*\.(webp|svg)$/.test(file.name)
				|| !/^[0-9a-f]{64}$/.test(file.sha256)
				|| ![file.bytes, file.width, file.height].every(value => Number.isSafeInteger(value) && value > 0)) {
				throw new Error(`Invalid article asset file in ${name}`);
			}
			const extension = path.extname(file.name);
			const key = `${inventory.prefix}/${file.name.slice(0, -extension.length)}`;
			if (assets[key]) throw new Error(`Duplicate article asset: ${key}`);
			assets[key] = {
				display: {
					path: `${inventory.prefix}/${file.name}`,
					bytes: file.bytes,
					format: extension === '.svg' ? 'SVG' : 'WEBP',
					width: file.width,
					height: file.height,
				},
				sources: [],
			};
		}
	}
	return assets;
}

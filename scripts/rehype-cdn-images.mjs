import cdnManifest from '../src/generated/cdn-assets.json' with { type: 'json' };

// Dimensions are already known locally. Never fetch R2 during an article build.
export function reserveCdnImageSpace(tree, manifest) {
	const files = new Map();
	for (const asset of Object.values(manifest.assets)) {
		for (const file of [asset.display, asset.cover]) {
			if (file?.width > 0 && file?.height > 0) files.set(file.path, file);
		}
	}
	let imageIndex = 0;
	function visit(node) {
		if (node.type === 'element' && node.tagName === 'img') {
			const props = node.properties ??= {};
			props.decoding ??= 'async';
			// Do not lazy-load a possible lead image; later body images can wait.
			props.loading ??= imageIndex++ === 0 ? 'eager' : 'lazy';
			try {
				const url = new URL(props.src);
				if (url.origin === new URL(manifest.origin).origin) {
					const file = files.get(decodeURIComponent(url.pathname).replace(/^\//, ''));
					if (file) {
						if (!props.width && !props.height) {
							props.width = file.width;
							props.height = file.height;
						} else if (!props.height) {
							props.height = Math.round(Number(props.width) * file.height / file.width);
						} else if (!props.width) {
							props.width = Math.round(Number(props.height) * file.width / file.height);
						}
					}
				}
			} catch { /* Local and unknown remote images retain the existing Astro pipeline. */ }
		}
		for (const child of node.children ?? []) visit(child);
	}
	visit(tree);
}

export default function rehypeCdnImages() {
	return tree => reserveCdnImageSpace(tree, cdnManifest);
}

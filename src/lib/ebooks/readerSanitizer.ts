import createDOMPurify from 'dompurify';

/** Keep only archive-generated image and stylesheet URLs, never arbitrary blob URLs. */
export function createEpubSanitizer(assetUrls: string[]) {
	const assets = new Set(assetUrls.filter(url => url.startsWith(`blob:${location.origin}/`)));
	const purifier = createDOMPurify(window);
	purifier.addHook('uponSanitizeAttribute', (node, attribute) => {
		const tag = node.localName;
		const image = tag === 'img' && attribute.attrName === 'src'
			|| tag === 'image' && ['href', 'xlink:href'].includes(attribute.attrName);
		const stylesheet = tag === 'link' && attribute.attrName === 'href'
			&& node.getAttribute('rel')?.toLowerCase() === 'stylesheet';
		if ((image || stylesheet) && assets.has(attribute.attrValue)) attribute.forceKeepAttr = true;
		else if (image && !attribute.attrValue.startsWith('data:image/')) attribute.keepAttr = false;
		else if (tag === 'link' && attribute.attrName === 'href') attribute.keepAttr = false;
	});
	return (html: string) => {
		const clean = purifier.sanitize(html, {
			WHOLE_DOCUMENT: true,
			ADD_TAGS: ['link'],
			FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base'],
			FORBID_ATTR: ['srcdoc', 'srcset', 'ping', 'target'],
		});
		const doc = new DOMParser().parseFromString(clean, 'text/html');
		for (const link of doc.querySelectorAll('link')) {
			if (link.rel !== 'stylesheet' || !assets.has(link.getAttribute('href') || '')) link.remove();
		}
		const policy = doc.createElement('meta');
		policy.httpEquiv = 'Content-Security-Policy';
		policy.content = "default-src 'none'; img-src blob: data:; style-src 'unsafe-inline' blob: data:; font-src blob: data:; base-uri 'none'; form-action 'none'";
		doc.head.prepend(policy);
		const text = doc.body.cloneNode(true) as HTMLElement;
		for (const decoration of text.querySelectorAll('svg, style')) decoration.remove();
		if (doc.body.querySelector('img, svg image') && !text.textContent?.trim()) {
			// Print margins and break-inside can push an image-only cover into a blank second column.
			doc.body.setAttribute('data-reader-image-page', '');
			// Calibre covers frequently specify preserveAspectRatio="none". Both
			// a viewport-sized SVG and that attribute stretch portraits horizontally.
			for (const svg of doc.body.querySelectorAll('svg')) {
				svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
				const box = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
				if (box?.length === 4 && box[2] > 0 && box[3] > 0) { svg.setAttribute('width', String(box[2])); svg.setAttribute('height', String(box[3])); }
			}
			const layout = doc.createElement('style');
			layout.textContent = `
				body[data-reader-image-page] { display:flex!important; align-items:center; justify-content:center; margin:0!important; padding:20px!important; box-sizing:border-box; }
				body[data-reader-image-page] :is(div,p,section,figure,a) { display:contents!important; }
				body[data-reader-image-page] :is(img,svg) { display:block; width:auto!important; height:auto!important; max-width:100%!important; max-height:calc(100vh - 40px)!important; object-fit:contain; }
				
			`;
			doc.head.append(layout);
		}
		return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
	};
}

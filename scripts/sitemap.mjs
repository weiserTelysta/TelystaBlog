import { writeFile } from 'node:fs/promises';

const PUBLIC_ENTRY_POINTS = new Set(['/', '/about/', '/blog/', '/ebooks/', '/gallery/', '/series/']);

/** @param {string} pathname */
export function isDiscoverablePath(pathname) {
 return PUBLIC_ENTRY_POINTS.has(pathname)
  || /^\/blog\/WEISER[0-9a-f]{12}\/$/.test(pathname)
  || /^\/(?:blog\/category|series)\/[a-z0-9-]+\/$/.test(pathname);
}

/** @param {string} value */
const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
/** @param {string} site @param {string[]} paths @param {(pathname: string) => boolean} include */
export function sitemapXml(site, paths, include = () => true) {
 const urls = [...new Set(paths.map(path => new URL('/' + path.replace(/^\/+/, ''), site).href))].filter(url => include(new URL(url).pathname)).sort();
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n') + '\n</urlset>\n';
}
/** @param {(pathname: string) => boolean} include @returns {import('astro').AstroIntegration} */
export default function singleSitemap(include) {
 /** @type {string | undefined} */
 let site;
 return { name: 'telysta-single-sitemap', hooks: {
  'astro:config:done': ({ config }) => { site = config.site; },
  'astro:build:done': async ({ dir, pages }) => {
   if (!site) throw new Error('A canonical site URL is required for sitemap.');
   await writeFile(new URL('sitemap.xml', dir), sitemapXml(site, pages.map(page => page.pathname), include));
  },
 } };
}

// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkScore from './scripts/remark-score.mjs';
import remarkArticleTitle from './scripts/remark-article-title.mjs';
import rehypeCdnImages from './scripts/rehype-cdn-images.mjs';
import remarkPostLinks from './scripts/remark-post-links.mjs';

import react from '@astrojs/react';
import singleSitemap from './scripts/sitemap.mjs';
import { readPostLinkIndex } from './scripts/lib/post-link-index.mjs';
import { buildPostRedirects } from './src/lib/postLinks.mjs';
import { fileURLToPath } from 'node:url';
import webFonts from './scripts/web-fonts.mjs';
import { readdirSync, readFileSync } from 'node:fs';
const ebookDirectory = fileURLToPath(new URL('./src/content/ebooks/catalog/', import.meta.url));
const protectedEbookPaths = new Set(readdirSync(ebookDirectory).filter(name => /^[A-Z]\.json$/.test(name)).flatMap(name => {
  /** @type {{ booklists?: { books: { id: string, access?: string }[] }[], books?: { id: string, access?: string }[] }} */
  const catalog = JSON.parse(readFileSync(ebookDirectory + name, 'utf8'));
  const books = catalog.booklists ? catalog.booklists.flatMap(group => group.books) : catalog.books || [];
  return books.filter(book => book.access === 'protected').map(book => `/ebooks/${encodeURIComponent(book.id)}/`);
}));

// GitHub Pages serves Astro's static HTML redirects; no server rewrite is needed.
const redirects = {
  ...buildPostRedirects(readPostLinkIndex(fileURLToPath(new URL('.', import.meta.url)))),
  '/series/serava-notes/': '/series/mirelle-notes/',
};

// https://astro.build/config
export default defineConfig({
  site: 'https://telysta.com',
  redirects,
  compressHTML: true,
  devToolbar: {
    enabled: false,
  },
  markdown: {
		syntaxHighlight: 'shiki',
		shikiConfig: {
			theme: 'github-dark-high-contrast',
			wrap: false,
		},
    processor: unified({
      remarkPlugins: [remarkArticleTitle, remarkPostLinks, remarkMath, remarkScore],
      rehypePlugins: [rehypeKatex, rehypeCdnImages],
    }),
  },
  integrations: [webFonts(), react(), singleSitemap((path) => {
    const pathname = decodeURI(path);
    return !/\.(json|txt|xml)$/.test(pathname) && !/^\/(?:404(?:\.html)?|console|telysta-console)(?:\/|$)/.test(pathname) && pathname !== '/resources/' && pathname !== '/ebooks/read/' && !protectedEbookPaths.has(pathname) && !Object.hasOwn(redirects, pathname);
  })],
});

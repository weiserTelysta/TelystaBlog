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
import sitemap from '@astrojs/sitemap';
import { readPostLinkIndex } from './scripts/lib/post-link-index.mjs';
import { buildPostRedirects } from './src/lib/postLinks.mjs';
import { fileURLToPath } from 'node:url';

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
  integrations: [react(), sitemap({ filter: (page) => {
    const pathname = decodeURI(new URL(page).pathname);
    return !pathname.endsWith('.json') && !Object.hasOwn(redirects, pathname);
  } })],
});

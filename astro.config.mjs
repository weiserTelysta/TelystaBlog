// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkScore from './scripts/remark-score.mjs';
import rehypeCdnImages from './scripts/rehype-cdn-images.mjs';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://telysta.com',
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
      remarkPlugins: [remarkMath, remarkScore],
      rehypePlugins: [rehypeKatex, rehypeCdnImages],
    }),
  },
  integrations: [react()],
});

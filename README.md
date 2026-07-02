# Telysta's Melancholy

Telysta's Melancholy is Weiser's personal writing space, built with Astro, React islands, SCSS, and Markdown content collections.

The site is designed as a calm dark archive: quiet starfield, generous space, restrained motion, readable writing, and a few private visual details hidden in the atmosphere.

## Current Features

- Canvas starfield background with subtle motion, click effects, meteors, and small hidden constellations.
- Personal home page with avatar, weighted random typewriter greeting, and configurable archive modules.
- Lightweight glass navigation with only active entries shown.
- Blog index at `/blog` with year/month timeline grouping.
- Markdown-powered article pages from Astro content collections.
- Static category pages at `/blog/category/[category]/`.
- Visual category accordion for topic filtering.
- Article metadata, tags, series navigation, and right-side TOC.
- Resource index with masonry cards, generated WebP display images, detail preview, and compact download actions.
- Global back-to-top control and Lenis-powered vertical smooth scrolling.
- Optional ICP footer, currently hidden through `src/config/site.ts`.

## Project Structure

```txt
src/components/home       Home page hero, archive modules, and reveal behavior
src/components/blog       Blog index, timeline, category filter, and accordion UI
src/components/article    Article header, TOC, post list, and series navigation
src/components/site       Shared header, footer, back-to-top, and scroll manager
src/components/starfield  Canvas starfield and interaction effects
src/config                Editable site, page, content, visual, and interaction config
src/content/weiser-posts  Markdown post sources
src/content/resources     Markdown resource entries
src/lib                   Data helpers and runtime utilities
src/styles                Global styles, fonts, typography tokens, and glass rules
docs                      Vision, deployment, maintenance, and planning documents
public/images/posts       Public post images referenced from Markdown
```

## Commands

```sh
npm run dev
npm run resources:images
npm run check
npm run build
npm run preview
```

`npm run check` runs TypeScript checking and the Astro production build.

`npm run resources:images` generates `.cover.webp` and `.preview.webp` display images for resource sources. `npm run build` runs this automatically before Astro builds the site. Generated resource WebP files stay out of Git; GitHub Actions restores them from cache when possible, and the generator uses a manifest plus source hashes to skip unchanged images.

## Content And Maintenance

Use [docs/maintenance.md](docs/maintenance.md) as the main guide for editing the site.
Use [docs/resource-content-guide.md](docs/resource-content-guide.md) for resource Markdown, gallery, credits, actions, downloads, and generated display images.

The project keeps editable content separate from derived logic:

- `src/config`: site copy, page settings, content taxonomy, visuals, and interaction parameters.
- `src/lib`: helpers that derive, validate, count, sort, or build URLs from config and content.
- `src/content`: Markdown posts and resource entries.
- `src/components`: rendering and interaction components.

Common edit points:

- Site name, navigation, SEO text, and optional ICP footer: `src/config/site.ts`
- Home page modules: `src/config/pages/home.ts`
- Home hero random greetings: `src/config/pages/homeGreetings.ts`
- Blog page copy: `src/config/pages/blog.ts`
- Article page copy: `src/config/pages/article.ts`
- Resource page copy: `src/config/pages/resources.ts`
- Blog categories: `src/config/content/blogCategories.ts`
- Blog series: `src/config/content/blogSeries.ts`
- Resource types: `src/config/content/resourceTypes.ts`
- Category accordion visuals: `src/config/visuals/categoryVisuals.ts`
- Scroll and chrome interaction settings: `src/config/interactions`
- Markdown posts: `src/content/weiser-posts`
- Resource entries: `src/content/resources`
- Post images: `public/images/posts`
- Fonts and type roles: `src/styles/fonts.scss`, `src/styles/global.scss`, `src/styles/typography.scss`

## Deployment

Deployment is handled by GitHub Pages through GitHub Actions. Push source code to the `main` branch; GitHub installs dependencies, runs `npm run build`, and publishes `dist/`.

Production domain: `https://telysta.com`

See [docs/deployment.md](docs/deployment.md) for setup notes.

## Direction

The project should stay quiet, spacious, and readable. Visual effects should serve the atmosphere instead of competing with the writing.

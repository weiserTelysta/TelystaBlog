# Telysta's Melancholy

Telysta's Melancholy is Weiser's personal writing space, built with Astro, React islands, SCSS, and Markdown content collections.

The site is designed as a calm dark archive: quiet starfield, generous space, restrained motion, readable writing, and a few private visual details hidden in the atmosphere.

## Current Features

- Canvas starfield background with subtle motion, click effects, meteors, and small hidden constellations.
- Personal home page with avatar, time-based typewriter greeting, and configurable archive modules.
- Lightweight glass navigation with only active entries shown.
- Blog index at `/blog` with year/month timeline grouping.
- Markdown-powered article pages from Astro content collections.
- Static category pages at `/blog/category/[category]/`.
- Visual category accordion for topic filtering.
- Article metadata, tags, series navigation, and right-side TOC.
- Global back-to-top control and Lenis-powered vertical smooth scrolling.
- ICP footer: `浙ICP备2025149243号-1`.

## Project Structure

```txt
src/components/home       Home page hero, archive modules, and reveal behavior
src/components/blog       Blog index, timeline, category filter, and accordion UI
src/components/article    Article header, TOC, post list, and series navigation
src/components/site       Shared header, footer, back-to-top, and scroll manager
src/components/starfield  Canvas starfield and interaction effects
src/content/posts         Markdown post sources
src/lib                   Site config, blog data, content helpers, and scroll runtime
src/styles                Global styles, fonts, typography tokens, and glass rules
docs                      Vision, deployment, maintenance, and planning documents
public/images/posts       Public post images referenced from Markdown
```

## Commands

```sh
npm run dev
npm run check
npm run build
npm run preview
```

`npm run check` runs TypeScript checking and the Astro production build.

## Content And Maintenance

Use [docs/maintenance.md](docs/maintenance.md) as the main guide for editing the site.

Common edit points:

- Site name, navigation, SEO text, and ICP record: `src/lib/siteConfig.ts`
- Home page modules: `src/lib/homeSections.ts`
- Blog categories: `src/lib/blogCategories.ts`
- Category accordion visuals: `src/lib/blogCategoryVisuals.ts`
- Markdown posts: `src/content/posts`
- Post images: `public/images/posts`
- Fonts and type roles: `src/styles/fonts.scss`, `src/styles/global.scss`, `src/styles/typography.scss`

## Deployment

Deployment is handled by GitHub Pages through GitHub Actions. Push source code to the `main` branch; GitHub installs dependencies, runs `npm run build`, and publishes `dist/`.

Production domain: `https://telysta.com`

See [docs/deployment.md](docs/deployment.md) for setup notes.

## Direction

The project should stay quiet, spacious, and readable. Visual effects should serve the atmosphere instead of competing with the writing.

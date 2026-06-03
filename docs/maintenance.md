# Maintenance Guide

This guide explains where to edit common site content and configuration for Telysta's Melancholy.

Keep source files encoded as UTF-8. Do not edit generated files in `dist/`; they are rebuilt from source.

## Site Identity

Edit `src/lib/siteConfig.ts` for global site information:

- `name`: visible site name in the header.
- `defaultTitle`: default browser title.
- `defaultDescription`: default SEO description.
- `authorName`: site author.
- `icpRecord`: ICP record shown in the footer.
- `home.title` and `home.description`: home page metadata.
- `navItems`: header navigation entries.

Only add a navigation item after the target page exists. Disabled placeholder links make the site feel unfinished.

## Home Page Modules

Edit `src/lib/homeSections.ts` to change the modules below the home hero.

Each section supports:

- `id`: stable identifier.
- `type`: visual/content type.
- `eyebrow`: small label.
- `title`: section title.
- `description`: main text.
- `items`: optional links or entries.
- `enabled`: set to `false` to hide a section.
- `order`: controls display order.

Use `external: true` for external links so the component can add the correct link behavior.

Some current text in this file may still need copy cleanup. Keep future edits in UTF-8.

## Blog Posts

Markdown posts live in `src/content/posts`.

Start from `src/content/posts/_template.md` when creating a new post. A typical post uses frontmatter like:

```md
---
title: "Post title"
description: "Short summary shown in lists and metadata."
publishedAt: 2026-06-03
updatedAt: 2026-06-03
category: manuscript
tags:
  - Astro
  - Blog
series: telysta-blog-build
draft: false
---
```

Write the article body below the frontmatter.

Images used inside posts should usually live in `public/images/posts`, then be referenced with normal Markdown:

```md
![Image description](/images/posts/example.webp)
```

## Categories And Tags

Categories are the main columns of the blog. They should be few, stable, and useful for filtering.

Edit `src/lib/blogCategories.ts` to change category ids, titles, subtitles, descriptions, and foil presets.

Tags are lighter metadata written in each post frontmatter. They can be more flexible and more specific than categories.

Do not use categories like tags. If a label describes the main home of a post, it is a category. If it describes a topic inside the post, it is a tag.

## Category Accordion Visuals

Edit `src/lib/blogCategoryVisuals.ts` for the visual category selector.

Accordion images are imported from `src/assets/images/accordion`.

Common fields:

- `cardInscription.prefix`: script-style name on the card.
- `cardInscription.name`: category label on the card.
- `shortTitle`: compact label.
- `description`: short category preview text.
- `image`: imported visual asset.
- `imagePosition`: CSS object-position value.
- `imageScale`: visual scale multiplier.
- `tone`: visual tone key.

Keep accordion images compressed. Large test images can make the first category interaction feel slow.

## Fonts And Typography

Font files are loaded in `src/styles/fonts.scss`.

Global font roles are defined in `src/styles/global.scss`:

- `--font-body`: general body text.
- `--font-display`: restrained serif/display text such as navigation and labels.
- `--font-script`: script signature text for the accordion.
- `--font-hero-title`
- `--font-page-title`
- `--font-article-title`
- `--font-item-title`
- `--font-prose-heading`
- `--font-meta`

Reusable type classes live in `src/styles/typography.scss`.

Prefer changing font roles instead of editing individual components one by one. This keeps the visual system consistent.

## Smooth Scrolling

Global vertical smooth scrolling is managed by:

- `src/components/site/ScrollManager.tsx`
- `src/lib/scrollConfig.ts`
- `src/lib/scrollRuntime.ts`

Local scrolling areas such as the category accordion, article TOC, and code blocks should stay native. Mark such areas with `data-scroll-native` when needed.

Avoid routing horizontal accordion scrolling through the global Lenis instance.

## Complex Interaction Components

Some components contain more interaction logic than ordinary presentational UI.

`src/components/blog/CategoryAccordion.tsx` currently owns:

- modal open and close state.
- focus trapping.
- horizontal rail wheel behavior.
- category preselection and confirmation.
- card pointer tilt.

If this file grows further, prefer extracting logic into small helpers before adding new visual effects. Good future boundaries include rail scroll control, focus trap logic, selection state, and card tilt behavior.

`src/components/starfield/StarfieldBackground.tsx` currently owns:

- canvas lifecycle.
- starfield animation.
- pointer interaction state.
- click dust effects.
- meteor and heart constellation events.

When changing it, watch frame cost carefully. Decorative animation should never make reading or scrolling feel heavy.

## Content Consistency Checks

The content system is currently schema-checked by Astro, but a few cross-file rules are still maintained by convention:

- Each post `category` should exist in `src/lib/blogCategories.ts`.
- Each category should have a visual entry in `src/lib/blogCategoryVisuals.ts`.
- Each post `series`, when present, should exist in `src/lib/blogSeries.ts`.
- `seriesOrder` values should be unique inside the same series.

These rules can become a small validation script later if the archive grows.

## Deployment

See `docs/deployment.md`.

In normal use:

```sh
npm run check
git status
git add ...
git commit -m "..."
git push
```

GitHub Actions builds the site and publishes `dist/`.

## Before Committing

Run:

```sh
npm run check
```

Also check:

- New Markdown posts are not marked `draft: true` unless intentionally hidden.
- New images are reasonably compressed.
- New categories have both data and visual config.
- New navigation links point to existing pages.
- Text files are saved as UTF-8.

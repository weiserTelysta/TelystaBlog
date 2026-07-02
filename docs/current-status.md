# Current Status

Updated: 2026-07-02

## Completed

- Home page with the current Telysta's Melancholy atmosphere.
- Canvas starfield background with interaction, breathing, meteors, long meteors, click dust, and constellation-style easter eggs.
- Shared site header, optional footer, global back-to-top control, and Lenis-powered vertical smooth scrolling.
- GitHub Pages deployment workflow.
- Markdown-based blog content collection under `src/content/weiser-posts`.
- Blog navigation page at `/blog`.
- Static category pages at `/blog/category/[category]/`.
- Article detail route and article reading layout.
- Article metadata, tags, series navigation, and right-side TOC.
- Year and month based blog timeline.
- Blog timeline split into focused components such as `BlogTimeline`, `BlogMonthSection`, and `BlogPostItem`.
- Visual category accordion for blog category filtering.
- Category semantic config and visual config are separated.
- Resource content collection under `src/content/resources`.
- Resource index page at `/resources`.
- Resource type filtering with URL state.
- Resource masonry layout with image-led cards.
- Resource detail overlay with multi-image preview, wheel switching, keyboard navigation, download menu, and related action links.
- Resource display images can be generated as `.cover.webp` and `.preview.webp` from PNG, JPG, and JPEG source files.
- Resource downloads merge gallery originals with local and external download actions.
- Resource page motion uses Motion for card enter, exit, and layout transitions.
- Back-to-top behavior adapts around the resource page.
- Editable site, page, content, visual, typography, and interaction settings are centralized under `src/config` and `src/styles`.
- Blog category, blog series, and resource type helper logic is separated into `src/lib`.
- Project design and architecture principles are recorded in `docs/project-knowledge.md`.
- Current stage decisions and follow-up candidates are recorded in `docs/stage-log.md`.

## Current Content Systems

Posts live in `src/content/weiser-posts/`.

Resources live in `src/content/resources/`.

Both systems use Astro Content Collections, so schema errors are caught during development and build.

## Blog System

Each post uses frontmatter for:

- `title`
- `description`
- `publishedAt`
- `updatedAt`
- `category`
- `tags`
- `draft`
- optional `series`
- optional `seriesOrder`
- optional `cover`

Only posts with `draft: false` are public.

Categories are defined in `src/config/content/blogCategories.ts`. Category ids should stay stable because they are used by frontmatter, routes, and filters.

Category visual entries live in `src/config/visuals/categoryVisuals.ts`. This file connects category ids with OC images, short display titles, descriptions, image crop tuning, and visual tone settings.

Series entries live in `src/config/content/blogSeries.ts`.

## Resource System

Each resource uses frontmatter for:

- `id`
- `title`
- `summary`
- `type`
- `status`
- `image`
- `publishedAt`
- `updatedAt`
- `formats`
- optional `cover`
- optional `preview`
- optional `variantCount`
- optional `license`
- optional `gallery`
- optional `credits`
- `actions`

`image` is required. `cover` and `preview` are optional optimization fields. When they are omitted, the resource system falls back to `image`.

When generated WebP variants exist next to PNG, JPG, or JPEG sources, the resource system prefers `.cover.webp` for cards and `.preview.webp` for detail display. Original source images remain the download target.

Resource types are defined in `src/config/content/resourceTypes.ts`. Adding a resource type should happen there first so schema validation, filters, and URL handling stay aligned.

## Current Risks

- The working tree should still be grouped carefully before the next feature stage if more local edits are added after this snapshot.
- Resource page visuals are much closer to the intended atmosphere, but they still need visual checks after large content batches.
- Large source images are acceptable as originals, but the resource image generation step must run before local preview or production build.
- Generated `.cover.webp` and `.preview.webp` files are ignored by Git. This is intentional while GitHub Pages runs the build, but it depends on the build pipeline continuing to execute `npm run build`.
- `docs/resources.md` contains the right maintenance ideas, but it should be periodically checked in a UTF-8 aware editor because PowerShell may display Chinese documentation as mojibake.
- The category accordion and starfield remain long-term interaction pressure points because they coordinate multiple animation and input states.
- Resource detail interactions coordinate wheel events, scroll locking, focus trapping, image preloading, pending states, and reduced motion. Future changes should stay small and verified.

## Code Quality Notes

Current healthy points:

- Editable content and derived logic have clearer boundaries: config describes data, lib handles lookup, counting, URL helpers, and data shaping.
- Astro Content Collections provide typed Markdown data sources for posts and resources.
- Site identity and navigation are centralized in `src/config/site.ts`.
- Page copy is moving into `src/config/pages`.
- Content taxonomy is moving into `src/config/content`.
- Visual category configuration is separated from semantic category configuration.
- Font roles and reusable typography classes are centralized in `src/styles/global.scss` and `src/styles/typography.scss`.

Current maintenance risks:

- Several components still carry both interaction and presentation responsibilities, especially resource and visual accordion components.
- The working tree should be grouped into clear commits before another large feature round.
- Some documentation still overlaps in responsibility. `docs/maintenance.md` should be the main operator guide, while this file should stay a status snapshot.
- Resource optimization now has an automatic display image script, but original asset selection and external large-file hosting remain manual content decisions.

## Short-Term Maintenance Principles

- Do not mix visual tuning, interaction changes, content schema changes, and documentation updates in one large batch.
- Keep editable content in `src/config` or `src/content`.
- Keep derived logic in `src/lib`.
- Keep components focused on rendering and interaction state.
- Verify the visual path after changing any shared typography token.
- Treat resource image optimization as a separate concern from resource page layout.

## Next Stage Candidates

1. Group the current working tree into clear commit boundaries.
2. Visually verify the resource page after the current documentation and skill pass.
3. Add more real posts and resources to test whether the current layouts scale naturally.
4. Consider a small validation script for cross-file rules such as category visual coverage, series ids, resource type ids, and resource action paths.
5. Revisit `docs/resources.md` in a UTF-8 aware editor if the Chinese resource guide should remain a primary document.

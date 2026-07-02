# Stage Log

## 2026-07-02

This stage focused on making the resource page feel like a quiet visual index while keeping source assets and downloads maintainable.

### Completed Direction

- The resource page moved from a fixed grid toward a responsive masonry layout that respects each image's aspect ratio.
- Resource display images can now be generated as `.cover.webp` and `.preview.webp` while original images remain available for download.
- Resource cards gained Motion-powered enter, exit, and layout transitions.
- The detail overlay gained multi-image navigation, wheel-based switching, image preloading, pending states, and compact download selection.
- Download files now merge gallery originals with local and external download actions, so PSD and netdisk files can live in the same download model without becoming resource categories.
- Back-to-top behavior was adjusted to avoid fighting the resource page's wider visual surface.

### Principles Learned

- It is better to wait briefly and appear in the correct masonry layout than to render immediately in the wrong layout and jump into place.
- Layout animation and hover animation should not fight over the same transform. Put layout motion on an outer wrapper and keep hover polish on inner visual elements.
- Local wheel interactions must stop global scroll side effects when they intentionally control image navigation.
- Resource downloads should stay clear and useful, but the page should not borrow marketplace visual language.
- Generated WebP files are performance artifacts. Original files and Markdown frontmatter remain the content source of truth.

### Current Follow-Up Candidates

1. Group the working tree into clear commit boundaries.
2. Visually test the resource page on desktop and mobile after the current batch of real resources.
3. Add a lightweight resource/content validation script if resource entries keep growing.
4. Keep the new interaction polish rules available as a Codex skill for future UI work.

## 2026-07-01

This stage focused on turning the site from a set of working pages into a more maintainable personal blog system.

### Completed Direction

- The site identity and navigation were simplified around Telysta's Melancholy.
- The ICP footer was removed from the layout.
- Home page content, random profile identity, and random greetings were moved toward configurable data.
- Blog banner usage was reduced so the blog index relies more on the existing starfield atmosphere.
- The article page gained a more capable right-side reading aid with TOC, custom progress rail, and back-to-top interaction.
- Article TOC behavior was refined so it should treat the Markdown article body as the main reading range.
- The resource page moved toward a quieter index model with content-driven resource entries, typed filters, detail overlay, gallery-ready data, compact actions, and fallback image behavior.
- Resource maintenance documentation was added for Markdown frontmatter, gallery entries, credits, and actions.
- Shared configuration and helper boundaries were improved across site, blog, article, home, resources, typography, and interactions.

### Principles Learned

- A page can be technically functional and still visually wrong if its structure uses the wrong language. Resource pages should not inherit storefront or gallery-platform weight.
- Sticky and custom scroll interactions are high-risk. They should be stable first, beautiful second, and never cause layout shift.
- The TOC is a reading helper, not a complete document navigator. It should not compete with the article body or with series navigation.
- Local scroll areas should be isolated from global smooth scrolling.
- More configuration is useful only when it keeps the operator interface clear. Configuration files should remain data-focused; derived behavior belongs in `src/lib`.
- Large visual assets should be treated as source material. Covers and previews are performance tools, not separate resource identities.

### Current Follow-Up Candidates

1. Finish validating article TOC click, highlight, and rail behavior on long posts.
2. Add more real resource entries to test gallery, credits, and action rendering.
3. Review the resource detail overlay after real multi-image resources exist.
4. Add a lightweight validation script for category ids, series ids, resource types, and missing visual config.
5. Keep commit boundaries small before starting the next large feature stage.

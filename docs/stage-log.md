# Stage Log

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

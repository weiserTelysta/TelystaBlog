# Project Knowledge

Updated: 2026-07-01

This document records the design and architecture principles behind Telysta's Melancholy. It is not a task list. It is the shared memory for future development decisions.

## Core Atmosphere

The site should feel calm, spacious, low-contrast, and personal. The visual center is not a product dashboard or a gallery platform, but a quiet writing space with a light ACG identity.

Empty space is part of the design. Do not fill every blank area with cards, borders, widgets, or explanatory text. The starfield, typography, and slow motion need room to breathe.

ACG assets are identity signals. They can appear in the home profile, category accordion, resource previews, and small delight moments, but they should not overpower reading or navigation.

## Homepage System

Homepage prose uses one centered reading column while keeping section headings, paragraphs, and navigation copy aligned to the inline start. Identity headings, short atmospheric lines, and the social icon row may be centered, but long profile paragraphs should retain a stable reading edge. Avoid nesting narrower prose widths inside the centered column because that makes the page appear offset and causes unnecessarily early wrapping.

Homepage navigation groups use a responsive grid rather than a permanently stacked list. At medium and wide widths, links should form two or three columns according to available space and continue onto later rows. On narrow mobile layouts, the same links collapse to one column so labels, descriptions, and focus states remain readable.

Keep these navigation groups visually light and left-aligned. Reuse the existing thin rail, node, typography, and restrained hover treatment instead of turning the links into filled cards or a dashboard grid.

## Interaction Principles

Interactions should feel tactile but restrained. The site can have soft reveal, smooth scrolling, star dust, category card tilt, resource preview switching, and subtle hover states. It should not feel like a game menu, a card draw screen, or a commercial asset marketplace.

Lenis is used for global vertical smooth scrolling only. Local scroll areas have their own interaction meaning and should stay isolated from Lenis. This includes article TOC, code blocks, resource overlays, and horizontal category rails.

When a custom scroll control is introduced, it must not create layout shift. It should be visually light, have a stable hit area, and avoid native scrollbar appearance unless the local area truly needs native behavior.

For animation work, prefer a calm reveal over immediate unstable rendering. It is better for a layout to wait briefly and appear in the right place than to flash in the wrong place and settle afterward.

Separate layout motion from local hover polish. If a component uses Motion layout animation, put layout transforms on an outer wrapper and keep hover effects on inner visual elements such as image, shadow, color, or opacity.

## Content And Configuration Boundaries

Editable site information belongs in `src/config` or `src/content`.

Derived logic belongs in `src/lib`.

Components should render, compose, and own local interaction state. They should not become the place where site copy, taxonomy, or long-term editable data is hidden.

If a future maintainer wants to change a title, navigation item, home section, category label, resource type, resource entry, greeting, or visual identity asset, they should not need to search through component internals first.

## Blog System

The `/blog` page is a navigation page. It sorts entries by year and month internally, exposes only the year as a visible grouping heading, and lets readers enter posts. It is not the article reading surface.

The blog index uses a centered reading column while keeping its text left-aligned. Its visible hierarchy is intentionally compact: one sans-serif English page title, a category entry immediately below it, then a quiet year marker followed by more prominent post titles. Visible month headings are omitted because each row already carries a complete English publication date. A thin timeline and small circular nodes retain chronological rhythm without becoming decoration. Each row shows an excerpt derived from the first substantial Markdown body paragraph, its published date, category, and at most two tags; `description` is the excerpt fallback, while update dates, counts, and year jumps must not compete in the archive.

The article page is the main reading surface. Its typography and layout have priority over decoration. The visible header contains only the article title and compact English published/updated month-day metadata; description, category, tags, duplicate Blog links, and series metadata stay out of the title block. The authored `description` remains available to document metadata and archive fallback behavior.

The 760px title and prose measure stays mathematically centered in the viewport in every TOC state. The TOC is a default-closed, fixed drawer that enters horizontally from the right without participating in article layout or changing prose wrapping. On wide screens, its persistent control is only a quiet chevron near the lower-right edge of the prose; the accessible name and native tooltip retain the `Contents` meaning without permanently displaying the word. The open outline uses the existing page canvas rather than a dark card or framed panel. On compact screens the same edge control opens a translucent blue-black overlay with a quiet backdrop so navigation never becomes illegible over prose. Escape, backdrop click, focus restoration, reduced motion, and local native scrolling are preserved.

The TOC renders the complete authored H2-H4 outline with visible indentation. Its current-reading state uses only a modest text-luminance change: no underline, marker, background, or weight change. Hover also changes only luminance, keyboard focus keeps an independent thin outline, and the active link retains `aria-current="location"`.

Series navigation appears once after the article as a single series-name link. Series descriptions, post counts, and previous/next controls belong on the dedicated series surface rather than in the article reading flow.

TOC highlighting should represent the current reading position, not simply the newest heading that entered an observer. Click navigation, active state, and the visual rail should use one consistent source of truth.

## Resource System

The resource page is a quiet resource index, not a storefront and not a heavy gallery platform.

Each resource has one primary type. Formats such as PNG, PSD, ZIP, or external netdisk links are delivery methods, not resource categories.

Resource entries should be maintained through Markdown frontmatter in `src/content/resources`. A single resource can include a gallery when multiple images belong to the same theme.

Cards should be image-led and lightweight. Detail overlays can show richer information, but download actions should remain compact and clear.

Large original files are acceptable as source material, but pages should prefer lighter covers and previews when performance becomes noticeable. If cover or preview is missing, the system falls back to the original image for convenience.

Resource page motion should feel like quiet browsing. Avoid aggressive card lift, loud glass controls, reward-style feedback, or download UI that makes the page feel like a commercial asset marketplace.

## Typography

Typography is a visual system, not a per-component accident. Font roles should be controlled through shared style tokens and reusable type classes.

Body reading should stay clear and stable. Display fonts are for restrained identity, navigation, category labels, and atmospheric headings. Script fonts are reserved for signature-like moments such as category card inscriptions.

If a heading feels too heavy, solve it through the shared type role first. Avoid scattering one-off font overrides across components.

## Maintenance Rules

Do not mix large visual redesigns, content schema changes, interaction runtime changes, and documentation rewrites unless the work is intentionally grouped and committed in clear stages.

Before adding a new feature, check whether the required editable data already has a home in `src/config` or `src/content`.

Before adding new interaction code, check whether it conflicts with Lenis, local scroll areas, keyboard behavior, focus handling, or layout stability.

Before adding new visual assets, check whether they need a cover, preview, or compressed variant.

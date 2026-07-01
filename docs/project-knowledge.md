# Project Knowledge

Updated: 2026-07-01

This document records the design and architecture principles behind Telysta's Melancholy. It is not a task list. It is the shared memory for future development decisions.

## Core Atmosphere

The site should feel calm, spacious, low-contrast, and personal. The visual center is not a product dashboard or a gallery platform, but a quiet writing space with a light ACG identity.

Empty space is part of the design. Do not fill every blank area with cards, borders, widgets, or explanatory text. The starfield, typography, and slow motion need room to breathe.

ACG assets are identity signals. They can appear in the home profile, category accordion, resource previews, and small delight moments, but they should not overpower reading or navigation.

## Interaction Principles

Interactions should feel tactile but restrained. The site can have soft reveal, smooth scrolling, star dust, category card tilt, resource preview switching, and subtle hover states. It should not feel like a game menu, a card draw screen, or a commercial asset marketplace.

Lenis is used for global vertical smooth scrolling only. Local scroll areas have their own interaction meaning and should stay isolated from Lenis. This includes article TOC, code blocks, resource overlays, and horizontal category rails.

When a custom scroll control is introduced, it must not create layout shift. It should be visually light, have a stable hit area, and avoid native scrollbar appearance unless the local area truly needs native behavior.

## Content And Configuration Boundaries

Editable site information belongs in `src/config` or `src/content`.

Derived logic belongs in `src/lib`.

Components should render, compose, and own local interaction state. They should not become the place where site copy, taxonomy, or long-term editable data is hidden.

If a future maintainer wants to change a title, navigation item, home section, category label, resource type, resource entry, greeting, or visual identity asset, they should not need to search through component internals first.

## Blog System

The `/blog` page is a navigation page. It introduces the article system, groups entries by year and month, and lets readers enter posts. It is not the article reading surface.

The article page is the main reading surface. Its typography and layout have priority over decoration. The right-side TOC should help orientation inside the Markdown article body only. Series navigation is separate after-content navigation and must not affect TOC highlighting.

TOC highlighting should represent the current reading position, not simply the newest heading that entered an observer. Click navigation, active state, and the visual rail should use one consistent source of truth.

## Resource System

The resource page is a quiet resource index, not a storefront and not a heavy gallery platform.

Each resource has one primary type. Formats such as PNG, PSD, ZIP, or external netdisk links are delivery methods, not resource categories.

Resource entries should be maintained through Markdown frontmatter in `src/content/resources`. A single resource can include a gallery when multiple images belong to the same theme.

Cards should be image-led and lightweight. Detail overlays can show richer information, but download actions should remain compact and clear.

Large original files are acceptable as source material, but pages should prefer lighter covers and previews when performance becomes noticeable. If cover or preview is missing, the system falls back to the original image for convenience.

## Typography

Typography is a visual system, not a per-component accident. Font roles should be controlled through shared style tokens and reusable type classes.

Body reading should stay clear and stable. Display fonts are for restrained identity, navigation, category labels, and atmospheric headings. Script fonts are reserved for signature-like moments such as category card inscriptions.

If a heading feels too heavy, solve it through the shared type role first. Avoid scattering one-off font overrides across components.

## Maintenance Rules

Do not mix large visual redesigns, content schema changes, interaction runtime changes, and documentation rewrites unless the work is intentionally grouped and committed in clear stages.

Before adding a new feature, check whether the required editable data already has a home in `src/config` or `src/content`.

Before adding new interaction code, check whether it conflicts with Lenis, local scroll areas, keyboard behavior, focus handling, or layout stability.

Before adding new visual assets, check whether they need a cover, preview, or compressed variant.

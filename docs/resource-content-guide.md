# Resource Content Guide

Resources are maintained as Markdown files in `src/content/resources`. Each file describes one public resource entry for the resources page.

Do not put notes, drafts, or README files in `src/content/resources`. Astro reads every Markdown file there as a resource entry.

## Basic Fields

```md
---
id: weiser_bunny_01
title: Weiser Bunny
summary: A short sentence shown in the resource list and detail view.
type: illustration
status: available
image: src/assets/images/illustration/weiser_bunny.png
publishedAt: 2026-06-06
updatedAt: 2026-06-28
formats:
  - PNG
  - PSD
variantCount: 3
license: Personal preview and communication only.
---
```

`id` must be unique.

`type` controls filtering. Use the existing resource type ids configured in `src/config/content/resourceTypes.ts`.

`status` is usually `available`. Use the existing status ids configured in `src/config/content/resourceTypes.ts`.

`image` is required. It is the original visual source for this resource.

`cover` is optional. If omitted, the page uses `image`.

`preview` is optional. If omitted, the page uses `image`.

## Gallery

Use `gallery` when one resource contains multiple images under the same theme.

```md
gallery:
  - src: src/assets/images/illustration/weiser_bunny.png
    label: Main
    alt: Weiser Bunny main illustration
  - src: src/assets/images/illustration/weiser_bunny_alt.png
    label: Alt
    alt: Weiser Bunny alternate illustration
```

If `gallery` is omitted, the detail view falls back to `preview` or `image`.

## Credits

Use `credits` for source, author, artist, project page, or other attribution links.

```md
credits:
  - label: Artist
    name: Example Artist
    href: https://example.com
```

`href` is optional. Without `href`, the credit is rendered as plain text.

## Actions

Use `actions` for files and external download links.

```md
actions:
  - type: download
    label: PNG
    href: src/assets/images/illustration/weiser_bunny.png
    format: PNG
    primary: true
  - type: external
    label: PSD
    href: https://example.com/download
    format: PSD
    provider: Baidu Netdisk
    code: abcd
    note: Includes layered source files.
```

Local image paths under `src/assets` are resolved during build.

External links are kept as links.

Keep action labels short. Prefer `PNG`, `PSD`, `ZIP`, or `PROJECT` instead of long button text.

## Body Content

Text after the frontmatter is used as resource detail paragraphs.

```md
---
...
---

A short description of the resource.

Another paragraph if needed.
```

Keep this section concise. The resource card and detail view should stay light and image-led.

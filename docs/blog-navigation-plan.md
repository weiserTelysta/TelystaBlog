# Blog Navigation Plan

## Page Role

`/blog` is the article navigation page. It is not the article detail page.

Its purpose is to help readers enter the writing system, browse records by time, and filter posts by long-term categories.

The page should act like a quiet map of the writing system. It should show what exists, where to go next, and how the content is organized without pretending to be a full article reader.

## Atmosphere

The page should continue the current Telysta Blog atmosphere:

- dark
- spacious
- low contrast
- starfield-based
- quiet and personal
- lightly ACG / OC flavored
- animated, but restrained

The page should not become a heavy card grid, a dashboard, or a gacha-style interface. Empty space is part of the design and should be allowed to remain visible, especially while the blog has only a small number of posts.

## Content Model

Posts should be written as Markdown or MDX files and managed through Astro Content Collections.

Required frontmatter fields:

```md
---
title: "Post title"
description: "Short description"
publishedAt: 2026-05-27
updatedAt: 2026-05-27
category: "manuscript"
tags: ["Astro", "Canvas"]
draft: false
---
```

Field meaning:

- `title`: post title.
- `description`: short summary for navigation and metadata.
- `publishedAt`: original publish date.
- `updatedAt`: latest edit date. If no later edit exists, it can match `publishedAt`.
- `category`: stable category id.
- `tags`: supporting keywords.
- `draft`: hidden from public lists when true.

Cover images are optional and are not required for the `/blog` navigation page.

## Categories And Tags

Categories are long-term columns. They are stable, limited, and used for the main category filter.

Tags are supporting keywords. They can grow freely and describe concrete topics inside a post.

Categories should behave like columns or sections. A post should normally have one primary category. New categories can be added later, but each new category should represent a long-term writing direction rather than a temporary topic.

Tags should behave like quiet metadata. They help describe technologies, people, works, tools, moods, or smaller topics inside the post. Tags can grow naturally with writing, but they should not become the main navigation surface.

Example:

```txt
Category: manuscript
Tags: Astro / React / Canvas / GitHub Pages
```

The right-side category picker uses categories, not tags. Tags should stay visually quiet in the post metadata line.

## Category Config

Post frontmatter should store only a stable English slug:

```md
category: "manuscript"
```

Display names, OC flavor text, images, and foil effects should live in a category config file.

Category config fields:

```ts
{
  id: "manuscript",
  title: "Manuscript",
  subtitle: "Code & Projects",
  description: "A gentle description for this category.",
  image: "...",
  foil: "starlight"
}
```

The `id` should be a readable slug, not a numeric id such as `000000001`. Numeric labels can be used as visual decoration later, but should not be the primary data id or URL value.

Semantic category data and visual category data should stay separate. The stable category config should define ids, names, and descriptions. Visual config can add OC images, foil presets, short display titles, and interaction copy. This keeps the content schema stable when the visual design changes.

## Maintenance Boundaries

The blog navigation system should keep data, presentation, and interaction boundaries explicit.

`src/lib/blogCategories.ts` is the semantic category layer. It should define stable ids, public names, subtitles, descriptions, and category-level metadata. It should not import images or carry visual implementation details.

`src/lib/blogCategoryVisuals.ts` is the visual category layer. It can connect category ids to OC images, card inscriptions, tone presets, crop positions, image scale values, and future foil presets.

`src/lib/blogPosts.ts` is the post data shaping layer. It should handle published-post filtering, category filtering, year-month grouping, and date formatting. Page components should not duplicate this sorting or grouping logic.

Astro page components should compose data and view components. They should avoid hard-coding category-specific behavior.

The visual accordion should consume category config. It should not assume a fixed number of categories, and adding a category should mostly mean adding a semantic category entry, a visual entry, and an image resource.

## Page Layout

The page should use the existing starfield canvas as the global background.

Page structure:

```txt
Top:
  small low-contrast banner
  fade mask
  title and short intro

Main:
  year -> month -> post timeline

Side:
  category entry
  year jump list
```

The banner should be narrow and atmospheric. It should not occupy the whole viewport or compete with the timeline.

The side area should stay secondary. On desktop it can hold category entry and year navigation. On smaller screens it should collapse into lightweight controls so the timeline remains the main reading path.

## Timeline

The main post list should be grouped by:

```txt
Year -> Month -> Post
```

Example:

```txt
2026

05
  Post title
  05-27 / Manuscript / Astro / Canvas / Updated 05-28
```

The title should occupy its own line. Date, category, tags, and latest update time should sit below the title in a quieter metadata line.

The timeline should avoid heavy cards. Use fine lines, spacing, and low-contrast text to separate sections.

The timeline should be able to grow from a few posts to many posts. Empty years or months should not be fabricated. When there are only a few posts, the blank space should remain part of the atmosphere.

## Category Accordion

The category picker should be a visual accordion gallery, not a traditional text accordion.

Default page state:

```txt
Right side shows a light "Category" entry only.
```

After clicking the entry:

```txt
Light overlay appears.
Central visual accordion opens.
Original timeline remains visible but subdued.
```

Accordion item shape:

- vertical
- clipped as a parallelogram with CSS
- OC image based
- short title placed vertically near the top-left
- item layout size remains stable

Images should be clipped with CSS, not pre-cut manually. The source images can remain normal image files.

The accordion should be reusable. Adding a category should mostly require adding semantic category data, a visual entry, and an image path. The component should not hard-code a fixed number of categories.

## Category Interaction

Interaction states:

```txt
Hover:
  light foil
  light glare
  slight 3D tilt
  detail preview

First click:
  preselect item
  strengthen foil
  transform scale only, no layout resize
  show full detail area

Second click on the same item:
  confirm category
  update URL
  close accordion
  fade in filtered timeline

Click another item:
  switch preselection
  do not confirm the previous item
```

The detail area should sit below the accordion, not on the side. This keeps the layout easier to adapt for mobile and preserves space.

Detail area content:

```txt
Title
Subtitle
Playful description
Post count
Light confirm hint
```

Example:

```txt
Weiser's Secret
Daily fragments
Soft notes from ordinary days.
12 records
Click again to enter
```

The first click should be a preview and commitment moment, not immediate navigation. This prevents accidental category switches and gives the visual accordion time to communicate what the category means.

The second click on the same image confirms the selection. If the user clicks a different image after preselecting one, the preselection should move to the new image instead of confirming the old one.

## Foil And Feedback

The holo / foil effect should borrow the mechanism of card-style effects, not the saturated visual style.

Useful layers:

- pointer-driven glare
- low-opacity foil gradient
- pearl / iris color shift
- short sweep highlight
- thin selected edge light

The visual logic should be mostly CSS-driven. JavaScript should mainly update pointer CSS variables such as:

```txt
--pointer-x
--pointer-y
--rotate-x
--rotate-y
```

Foil effect should be subtle by default. Stronger foil should appear only on preselected or selected items.

Click feedback should be short and tactile, not gacha-like. Avoid long flashes, heavy particle bursts, or aggressive soundless "reward" animations.

The selected card can feel more alive through transform-based scale, pointer-driven tilt, a stronger edge light, and a brief shine pass. Its actual layout size should remain stable to avoid shaking the accordion.

Different categories can use different foil presets:

```txt
starlight
aurora
moonlit
prism
embers
ripple
```

## URL And Filtering

Category filter state should be reflected in the URL:

```txt
/blog/category/manuscript/
```

Filtering should update the timeline and keep the interface shareable and refresh-safe.

The static category route is the primary URL strategy. Query-based category URLs can remain as a compatibility entry:

```txt
/blog?category=manuscript
```

When this query form is detected, the page can redirect to the static category route.

There must be a way to return to all posts:

```txt
All Records
```

Year navigation should initially be a jump list, not a filter:

```txt
/blog#year-2026
```

Categories filter content. Years help readers jump through the timeline.

Changing category should not feel like a hard page snap. A short fade or reveal is acceptable, but the transition should stay fast enough that browsing remains efficient.

## Mobile

Mobile should not use a permanent right sidebar.

Mobile structure:

```txt
small banner
category entry button
timeline
year jump control
```

The category accordion can become a bottom drawer or full-screen light overlay on mobile. The two-step selection flow can remain:

```txt
tap once to preselect
tap again or tap confirm to enter
```

Motion should respect `prefers-reduced-motion`.

## Assets

Current test assets:

```txt
src/assets/banner/blog-banner.png
src/assets/images/accordion/accordion-weiser.png
```

`blog-banner.png` works as a low-contrast horizontal atmosphere image, but should be darkened and faded into the page.

The accordion OC image should preferably use a transparent background. Transparent images will blend better with the dark starfield page than white-background images.

Future asset directories should avoid spaces in path names. Preferred structure:

```txt
src/assets/images/banner/
src/assets/images/accordion/
```

## Phased Implementation

### Phase 1: Blog Data And Timeline

- Create Astro content collection for posts.
- Define frontmatter schema.
- Add sample posts.
- Create `/blog` page.
- Render year -> month -> post timeline.
- Add post metadata line with published date, updated date, category, and tags.
- Add low-contrast banner.
- Add category config file.
- Add basic URL category filtering.
- Add lightweight category entry placeholder.

### Phase 2: Visual Category Accordion

- Status: entering implementation.
- Create reusable visual accordion component.
- Add light overlay.
- Add central accordion gallery.
- Clip OC images into vertical parallelograms.
- Add vertical short titles.
- Add hover preview.
- Add two-step click selection.
- Add detail area below the accordion.
- Sync selected category to URL.
- Close overlay after confirmation.

### Phase 3: Interaction Polish

- Add foil presets.
- Add pointer-driven glare and tilt.
- Add short click feedback.
- Add reduced motion behavior.
- Add mobile bottom drawer or full-screen overlay.
- Tune image brightness, masks, and transitions.
- Add graceful empty states.

## Accordion Future Refactor Direction

The current accordion interaction is sensitive because scrolling, preselection, close animation, focus handling, and pointer tilt all affect the same visual surface. Future refactors should be small and behavior-preserving.

Recommended extraction order:

1. Dialog open and close lifecycle.
2. Focus trap and focus restoration.
3. Horizontal rail scroll controller.
4. Card pointer tilt.
5. Category card rendering.
6. Foil and glare CSS presets.

After each extraction, verify:

- Opening the category selector.
- Closing by button, Escape, and overlay.
- Clearing preselection by clicking blank panel space.
- Two-click category confirmation.
- Clicking another card switches preselection instead of confirming.
- Normal wheel scrolling on the horizontal rail.
- First and last cards can be centered.
- Selected and hovered cards still respond to pointer tilt.
- Mobile layout still fits without unwanted page scroll.
- `prefers-reduced-motion` keeps the interface usable.

## Starfield Future Maintenance

The starfield is part of the blog atmosphere, so maintainability work should preserve its quiet, low-contrast feeling.

Future cleanup should avoid changing the whole canvas loop at once. Prefer extracting one boundary at a time:

- pointer intent state machine
- star renderer
- meteor and long meteor renderer
- constellation easter egg scheduling
- click dust lifecycle

New easter eggs should be added through small isolated modules instead of growing `StarfieldBackground.tsx` indefinitely.

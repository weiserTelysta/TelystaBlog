# Telysta Blog Project Vision

## Project Goal

Telysta Blog is a personal blog built with Astro and deployed through GitHub. The goal is not to copy an existing theme, but to create a long-term personal writing space with a calm, dark, layered, and readable atmosphere.

The project will be built from scratch on top of the current Astro project. SHBlog Next is a visual and structural reference, not a codebase to fork or directly modify.

## Core Direction

The blog should feel like a quiet personal space rather than a content platform. It should support writing, thinking, collecting, and long-term maintenance.

The first priority is to establish a clean blog foundation:

- global layout
- visual system
- home page
- article page
- content collections
- basic navigation
- readable typography

## Reference Style

SHBlog Next is the main reference for:

- spatial composition
- simple page structure
- modern blog feeling
- light and layered atmosphere
- quiet personal-site mood

The goal is to understand why it feels spacious and clean, then rebuild that feeling in this project with a more restrained visual language.

## Style To Avoid

The blog should avoid visual choices that break the dark atmosphere:

- high-saturation bright color blocks
- large colorful cards
- neon-like gradients used as primary surfaces
- decorative elements that compete with article content
- overly busy tag or card systems
- visual effects that make reading harder

Accent colors should be low-saturation and used sparingly.

## Visual Keywords

- dark base
- glassmorphism
- spatial depth
- modern UI
- light ACG atmosphere
- clean typography
- low saturation
- quiet contrast
- soft highlights
- readable content first

## Visual Principles

The base background should be dark but not pure black. It can lean toward blue-black, gray-black, or muted violet-black.

Glass surfaces should use transparency, blur, subtle borders, and shadow to create depth. They should not rely on bright colors to attract attention.

Light ACG influence should appear through atmosphere and detail, such as soft star dust, thin interface lines, subtle glow, illustration hints, or an expressive About page. It should not dominate the whole reading experience.

Text should remain calm, clean, and easy to read. The article page is the most important surface of the blog.

## Content Direction

The blog can grow around several content types:

- Notes: technical notes, tools, development logs, learning records
- Essays: personal thoughts, longer reflections, life writing
- Media: ACG, games, music, visual culture, collections
- Logs: short updates, weekly notes, fragmented records

The first version should keep categories simple and rely on tags for detail.

## Technical Direction

Astro is the main framework for pages, routing, content, SEO, RSS, and static generation.

TypeScript should stay enabled in strict mode.

SCSS should be used to build the visual system, including color tokens, typography, layout, glass surfaces, and responsive rules.

React should be used only for local interactive islands, such as search, theme toggles, small widgets, or later interactive components. It should not become the main structure of the whole site unless the project direction changes.

## First Stage Focus

The first stage should turn the default Astro starter into a real blog foundation.

Important first-stage outcomes:

- remove the default starter experience
- create a site-wide layout
- create global SCSS styles
- define color, spacing, typography, and glass surface tokens
- create a home page that reflects the blog identity
- set up Astro content collections for posts
- create a post list and article detail route
- add a small number of sample posts for design testing

Search, comments, RSS, sitemap, animation polish, and advanced archive features can come later.

## Current Decision

We will build from scratch instead of modifying SHBlog Next directly.

SHBlog Next remains a reference for spatial feeling and simplicity. The final blog should have its own design system, its own structure, and a quieter low-saturation atmosphere.

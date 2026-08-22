---
name: telysta-design-guardian
description: Preserve and validate Telysta's established editorial visual language. Use when modifying or reviewing Telysta page or component UI, article reading layouts, typography, color roles, glass surfaces, responsive behavior, focus states, dialogs, restrained motion, reduced-motion behavior, or when refactoring UI code without intending a visual redesign. Do not use for content-only Markdown editing, routine resource entry maintenance, image catalog searches, or unrelated backend scripts.
---

# Telysta Design Guardian

Protect Telysta as a quiet personal writing archive. Make the smallest change that solves the stated problem while preserving reading quality, atmosphere, and existing interaction ownership.

## Workflow

1. Inspect the affected page, component, styles, shared tokens, responsive rules, and rendered DOM before editing.
2. Read [references/style-profile.md](references/style-profile.md) before selecting colors, typography, spacing, imagery, surfaces, or layout.
3. Read [references/review-checklist.md](references/review-checklist.md) before implementing or reviewing interaction, responsive, accessibility, or motion changes.
4. Identify whether the request is a defect correction, accessibility correction, behavior-preserving refactor, or explicit redesign. Treat it as a redesign only when the user clearly requests one.
5. Preserve existing component structure and visual roles when a local correction is sufficient. Prefer shared tokens over new selector-specific literals.
6. Keep native semantics, keyboard behavior, scroll ownership, and reduced-motion paths intact.
7. Validate representative pages in a real browser at desktop and mobile widths. Include keyboard focus and reduced motion when interaction is affected.
8. Report any intentional visual difference and its reason. Treat unexplained differences as regressions.

## Guardrails

- Keep writing and navigation more prominent than decoration.
- Keep the dark blue-black canvas, low saturation, thin glass, soft borders, and generous empty space.
- Use moon blue and dusty pink as limited identity or state accents, not large filled surfaces.
- Keep ACG imagery as a quiet identity signal. Do not turn the site into a game menu, neon interface, marketplace, or heavy gallery.
- Preserve the current article measure and rhythm unless the task explicitly concerns readability.
- Do not add continuous motion, bounce, elastic overshoot, large zoom, or decorative parallax to reading flows.
- Do not route local dialogs, code blocks, article TOC, or horizontal rails through global Lenis scrolling.
- Do not remove visible keyboard focus. Do not use color or motion as the only state signal.
- Respect `prefers-reduced-motion`; keep the same function with immediate state changes.
- Avoid large rewrites of `CategoryAccordion`, `ResourceDetailOverlay`, or `StarfieldBackground` during a local visual fix.

## Accessibility Exceptions

Allow a small visual difference when required to restore readable contrast, visible focus, correct dialog focus, semantic controls, zoom resilience, or reduced-motion behavior. Keep the correction localized and preserve the surrounding palette and spacing.

## Review Output

State whether the existing style is preserved. List concrete regressions before optional polish. Distinguish functional, accessibility, responsive, and purely aesthetic findings.

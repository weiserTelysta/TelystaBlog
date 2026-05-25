# Telysta Blog Project

Telysta Blog is a personal blog project built with Astro and React islands. The current stage focuses on a quiet, dark, spacious personal homepage before the full writing system is introduced.

## Current Stage

- Canvas starfield background with subtle motion and small hidden details.
- Personal landing page with avatar, name, and time-based typewriter greeting.
- Lightweight glass navigation.
- ICP footer: `浙ICP备2025149243号-1`.
- Local Cinzel display font for brand/navigation styling.

The content system is not implemented yet. `Blog`, `About`, and `Friends` are visible as planned navigation items, but are intentionally disabled until their pages are built.

## Project Structure

```txt
src/components/home       Homepage identity and greeting components
src/components/site       Shared site chrome such as header and footer
src/components/starfield  Canvas starfield background
src/lib                   Shared data and small utilities
src/styles                Global style tokens and glass surface rules
docs                      Direction and project vision documents
```

## Commands

```sh
npm run dev
npm run build
npm run preview
```

## Deployment

Deployment is handled by GitHub Pages through GitHub Actions. Push source code to the `main` branch; GitHub installs dependencies, runs `npm run build`, and publishes `dist/`.

Production domain: `https://telysta.com`

See [docs/deployment.md](docs/deployment.md) for setup notes.

## Direction

The site should feel like a calm, dark personal archive: writing first, glass second, and ACG details hidden quietly in the atmosphere.

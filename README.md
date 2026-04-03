# cad-pga

Static Vite site for the "Clean up your Mesh!" PGA / ganja.js demo.

## Live Site

- Expected GitHub Pages URL: `https://timcash.github.io/cad-pga/`

## PWA Features

- Installable standalone app manifest
- Apple touch icon and Android app icons
- Maskable icons for launcher support
- Local service worker for app shell caching
- Vendored `ganja.js` so the installed app does not depend on a CDN fetch

## What Came Over From `guitar-tabs`

This repo keeps the parts of the `guitar-tabs` setup that are useful for a static demo site:

- Vite serves and builds the app from the root `index.html`.
- `vite.config.js` reads `VITE_SITE_BASE_PATH` so the site can build for a GitHub Pages subpath.
- `scripts/build-pages.mjs` runs the build, copies `dist/index.html` to `dist/404.html`, and writes `.nojekyll`.
- `.github/workflows/deploy-pages.yml` publishes `dist/` to GitHub Pages on pushes to `master`.

Unlike `guitar-tabs`, this repo is intentionally just a single-page static app. There is no local bridge server, no TypeScript app shell, and no test harness yet.

## Local Dev

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## GitHub Pages Build

```bash
npm run build:pages
```

The Pages helper automatically uses `/<repo-name>/` as the default base path when `GITHUB_REPOSITORY` is present.

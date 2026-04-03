# cad-pga

Static Vite site for a growing library of PGA / ganja.js demos with MathJax companion notes.

## Live Site

- Landing page: `https://timcash.github.io/cad-pga/`
- Mesh Cleanup demo: `https://timcash.github.io/cad-pga/mesh-cleanup/`
- Mesh Cleanup notes: `https://timcash.github.io/cad-pga/mesh-cleanup/readme/`
- CNC Kernel Simulator demo: `https://timcash.github.io/cad-pga/cnc-kernel-simulator/`
- CNC Kernel Simulator notes: `https://timcash.github.io/cad-pga/cnc-kernel-simulator/readme/`
- Gear Rotation Linkage demo: `https://timcash.github.io/cad-pga/gear-rotation-linkage/`
- Gear Rotation Linkage notes: `https://timcash.github.io/cad-pga/gear-rotation-linkage/readme/`
- Meshless FEA WoS demo: `https://timcash.github.io/cad-pga/meshless-fea-wos/`
- Meshless FEA WoS notes: `https://timcash.github.io/cad-pga/meshless-fea-wos/readme/`

## PWA Features

- Installable standalone app manifest
- Apple touch icon and Android app icons
- Maskable icons for launcher support
- Local service worker for app shell caching
- Vendored `ganja.js` so the installed app does not depend on a CDN fetch
- Bundled MathJax via npm so the notes render from the built site assets

## What Came Over From `guitar-tabs`

This repo keeps the parts of the `guitar-tabs` setup that are useful for a static demo site:

- Vite serves and builds the app from the root `index.html`.
- Vite is configured as a multi-page app so each example gets its own GitHub Pages path.
- Each example can also have a companion `readme/` route with bundled MathJax notes.
- `vite.config.js` reads `VITE_SITE_BASE_PATH` so the site can build for a GitHub Pages subpath.
- `scripts/build-pages.mjs` runs the build, copies `dist/index.html` to `dist/404.html`, and writes `.nojekyll`.
- `.github/workflows/deploy-pages.yml` publishes `dist/` to GitHub Pages on pushes to `main`.

Unlike `guitar-tabs`, this repo is intentionally just a static demo gallery. There is no local bridge server, no TypeScript app shell, and no test harness yet.

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

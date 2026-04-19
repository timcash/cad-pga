# CAD PGA

A small library of PGA and adjacent geometry demos.

The repo layout is intentionally simple now:

- one `index.html` for each example
- one `README.md` beside it
- one root `README.md`, which is also the base URL index page

Use the `README` button inside each demo to open that example's notes without leaving the example route.

## Navigation

The site now has one simple loop:

1. Open an example route.
2. Use `Details` for the short live-page summary.
3. Use `README` for the full notes for that example.
4. Use `Home` to return to this main README page.

That means there is no separate docs-site layer to keep in sync anymore. The content lives in this file and the per-example `README.md` files.

## Examples

- [Area from Boundary](./mesh-cleanup/)  
  Boundary sums encode polygon area even while the cone fan changes.

- [CNC Tool Motion](./cnc-kernel-simulator/)  
  One motor carries spindle rotation and feed motion; the red block is a static full-travel sweep proxy.

- [Look, Ma, No Matrices!](./look-ma-no-matrices/)  
  A compact carrier-plus-sensor frame stack inspired by Steven De Keninck's matrix-free renderer article.

- [Gear Hierarchy](./gear-rotation-linkage/)  
  Parent-local-world composition in a small 2D transform chain.

- [Heat by Sphere Walks](./meshless-fea-wos/)  
  A meshless harmonic heat example using PGA wall distances and Walk on Spheres.

## Shared Ideas

The examples stay small, but the shared geometry language is consistent:

$$
\begin{aligned}
X' &= \mathbf{M} X \widetilde{\mathbf{M}} \\
\partial K &= \sum_i E_i \\
d(P,\partial \Omega) &= \min_i \left|(P \wedge \widehat{L}_i)\mathbf{e}_{012}\right|
\end{aligned}
$$

- motors move rigid geometry
- oriented boundary sums encode content
- algebraic distance queries feed the meshless heat example

## References

- [Ganja.js](https://github.com/enkimute/ganja.js)
- [Bivector.net](https://bivector.net/)
- [Look, Ma, No Matrices!](https://enkimute.github.io/LookMaNoMatrices/)
- [Walk on Stars](https://www.cs.cmu.edu/~kmcrane/Projects/WalkOnStars/)
- [GCANs](https://proceedings.mlr.press/v202/ruhe23a.html)

## Utilities

- [Codex terminal](./codex/)
- [Legion websocket](./legion/)

## Local Dev

```bash
npm install
npm run dev
```

To refresh the screenshot grid used in the repo docs:

```bash
npm run test:ui
```

## Build

```bash
npm run build
npm run build:pages
```

`npm run build` copies the root README and the example READMEs into `dist`, so the home page and the in-demo README views keep working after build.

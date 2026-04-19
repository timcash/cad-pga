# Area from Boundary

Move the gauge point and the cone fan changes, but the signed area encoded by the boundary stays fixed.

## References

- [Verified paper record](https://arxiv.org/abs/2511.08058)
- [PGA Reference](https://bivector.net/PGA4CS.pdf)

## Verification Note

This example now cites the verified arXiv record for *Clean up your Mesh! Part 1: Plane and simplex*. An earlier repo draft pointed at a DOI that could not be verified for this title.

## Core Equations

The invariant object is the full oriented boundary, not one chosen fan triangulation:

$$
\begin{aligned}
\partial K &= \sum_{i=1}^{n} E_i, \qquad E_i = p_i \vee p_{i+1} \\
\Pi(o) &= o \vee \partial K \\
A(K) &= \frac{1}{2}\left\| \Pi(o) \right\|_{\infty}
\end{aligned}
$$

In dual 3D PGA, each edge is built as a join of adjacent points, and the gauge point joins the whole boundary sum into one plane-like quantity. That is why the green value in the demo stays fixed while the red facet sum does not.

## In Code

```js
let sumEdges = (pts[0] & pts[1]) * 0.0;
let absAreaSum = 0;

for (let i = 0; i < pts.length; i += 1) {
  const p1 = pts[i];
  const p2 = pts[(i + 1) % pts.length];
  const edge = p1 & p2;
  const triPlane = apex & edge;

  sumEdges = sumEdges + edge;
  absAreaSum += 0.5 * triPlane.Length;
}

const netAreaPlane = apex & sumEdges;
const netArea = 0.5 * netAreaPlane.Length;
```

In ganja.js dual 3D PGA, the join appears as `&`. The loop accumulates the oriented boundary first, then joins the apex to the whole sum.

## What Changes

The red cone sum depends on the gauge point:

$$
A_{\mathrm{abs}}(o) =
\frac{1}{2}\sum_{i=1}^{n}\left\| o \vee E_i \right\|
$$

This answers “how large are the cone facets right now?”

## What Stays Fixed

The oriented boundary cancels the height terms:

$$
\frac{1}{2}\left\| o \vee \sum_i E_i \right\|_{\infty}
=
\frac{1}{2}\left\| \sum_i o \vee E_i \right\|_{\infty}
$$

This answers “what area does the oriented polygon boundary encode?”

## Point Model

The demo uses the corrected 3D PGA point embedding:

```js
const point = (x, y, z) =>
  1e123 - x * 1e023 + y * 1e013 - z * 1e012;
```

That is the standard 3D PGA point embedding

$$
\mathbf{e}_{123} + x\mathbf{e}_{032} + y\mathbf{e}_{013} + z\mathbf{e}_{021}
$$

rewritten in ganja's basis ordering where

$$
\mathbf{e}_{032} = -\mathbf{e}_{023},
\qquad
\mathbf{e}_{021} = -\mathbf{e}_{012}
$$

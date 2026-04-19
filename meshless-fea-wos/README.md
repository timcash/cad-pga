# Heat by Sphere Walks

Boundary distance and sphere walks give a meshless heat solve.

## References

- [Muller's 1956 WoS paper](http://www.cs.fsu.edu/~mascagni/Muller_1956_Annals_Mathematical_Statistics.pdf)
- [Walk on Stars](https://www.cs.cmu.edu/~kmcrane/Projects/WalkOnStars/)
- [2D PGA Cheat Sheet](https://bivector.net/2DPGA.pdf)

## Verification Note

Despite the route name, the current page does **not** assemble a finite element system. It also does **not** implement the full Walk on Stars visibility machinery for mixed boundary conditions. The code is a classic Walk on Spheres-style harmonic heat demo driven by nearest-boundary distance queries.

## Boundary Value Problem

The current demo solves a harmonic field away from the boundaries:

$$
\begin{aligned}
\Omega &= [-2.5, 2.5]^2 \setminus \{(x,y) : x^2 + y^2 < r^2\} \\
\Delta u &= 0 \qquad \text{in } \Omega \\
u &= 100 \quad \text{on top and left walls} \\
u &= 0 \quad \text{on right wall, bottom wall, and inner disk}
\end{aligned}
$$

The solver only needs a reliable query for the distance from an interior point to the nearest part of the boundary.

## PGA Wall Distance

The rectangular walls are exact lines in 2D PGA:

$$
\begin{aligned}
p(x,y) &= \mathbf{e}_{12} - x\mathbf{e}_{02} + y\mathbf{e}_{01} \\
L_{ij} &= p_i \vee p_j \\
\widehat{L}_{ij} &= \frac{L_{ij}}{\|L_{ij}\|} \\
d_{\text{wall}}(P, \widehat{L}) &= \left| (P \wedge \widehat{L}) \mathbf{e}_{012} \right|
\end{aligned}
$$

```js
const point = (x, y) => 1e12 - x * 1e02 + y * 1e01;

const bounds = [
  { line: (pTL & pTR).Normalized, temp: 100 },
  { line: (pBL & pTL).Normalized, temp: 100 },
  { line: (pTR & pBR).Normalized, temp: 0 },
  { line: (pBR & pBL).Normalized, temp: 0 }
];

const dist = Math.abs((p ^ boundary.line).e012);
```

Once the wall lines are normalized, the pseudoscalar part of `P ^ L` is the orthogonal distance.

## Signed Distance Obstacle

The inner disk is just an SDF query:

$$
\begin{aligned}
d_{\text{disk}}(x,y) &= \sqrt{x^2 + y^2} - r \\
d(P,\partial\Omega) &=
\min\left(
\min_i d_{\text{wall}}(P,\widehat{L}_i),
\left| d_{\text{disk}}(x,y) \right|
\right)
\end{aligned}
$$

```js
const distToCircle = Math.sqrt(x * x + y * y) - circleRadius;

if (Math.abs(distToCircle) < minD) {
  minD = Math.abs(distToCircle);
  hitTemp = 0;
  hitLabel = "Ice block";
}
```

The nearest-boundary query can take the minimum over PGA boundaries and a non-PGA implicit surface without changing the rest of the solver.

## Walk on Spheres

Each step jumps to the edge of the largest empty circle:

$$
\begin{aligned}
d_k &= d(X_k, \partial \Omega) \\
\theta_k &\sim \mathrm{Uniform}(0, 2\pi) \\
X_{k+1} &= X_k + d_k(\cos \theta_k, \sin \theta_k)
\end{aligned}
$$

```js
const query = getShortestDistance(curr);
if (query.d < 0.03) {
  totalTemp += query.temp;
  break;
}

const angle = Math.random() * Math.PI * 2;
curr = point(
  getX(curr) + Math.cos(angle) * query.d,
  getY(curr) + Math.sin(angle) * query.d
);
```

Because the circle of radius `d_k` lies fully inside the domain, the walk can take large steps in empty space.

## Monte Carlo Estimate

The harmonic solution is the expected boundary value at first hit:

$$
u(x) = \mathbb{E}[g(X_{\tau_{\partial \Omega}})\mid X_0 = x]
$$

```js
const solvePoint = (startX, startY, walks = 24) => {
  let totalTemp = 0;

  for (let i = 0; i < walks; i += 1) {
    let curr = point(startX, startY);
    // Repeat WoS steps until a boundary epsilon is reached.
  }

  return totalTemp / walks;
};
```

## Why It Fits The Library

- PGA contributes exact wall primitives and an algebraic distance query
- the SDF contributes an easy implicit obstacle
- the solver only cares about nearest-boundary distance, so the representation stays composable
- the route name says FEA, but the current mathematics is a meshless Monte Carlo Laplace solve

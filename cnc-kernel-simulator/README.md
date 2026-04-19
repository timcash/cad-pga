# CNC Tool Motion

The white endmill is motor-driven. The red block is a static full-travel sweep proxy.

## References

- [3D PGA Cheat Sheet](https://bivector.net/3DPGA.pdf)
- [Look, Ma, No Matrices!](https://enkimute.github.io/LookMaNoMatrices/)

## Verification Note

This page is a direct rigid-motion demo, not one specific CAM paper implementation. The math is grounded in the Bivector and *Look, Ma, No Matrices!* PGA references, but the page is intentionally a small motor demo rather than a reproduction of a single machining paper.

## Core Equations

The moving tool is a motor acting on points:

$$
\begin{aligned}
P(x,y,z) &= \mathbf{e}_{123} + x\mathbf{e}_{032} + y\mathbf{e}_{013} + z\mathbf{e}_{021} \\
\ell_z &= \mathbf{e}_{12} \\
\mathbf{R}_z(\theta) &= \cos\!\left(\frac{\theta}{2}\right) + \sin\!\left(\frac{\theta}{2}\right)\ell_z \\
\mathbf{T}_x(d_x) &= 1 - \frac{1}{2} d_x \mathbf{e}_{01} \\
\mathbf{M}(t) &= \mathbf{T}_x(d_x(t))\,\mathbf{R}_z(\theta(t))
\end{aligned}
$$

The rotor turns the spindle about the tool axis. The translator advances the tool through the stock.

## In Code

```js
const point = (x, y, z) =>
  1e123 - x * 1e023 + y * 1e013 - z * 1e012;

const rotor =
  Math.cos(theta / 2) + Math.sin(theta / 2) * 1e12;

const translator = 1 - 0.5 * dx * 1e01;
const motor = translator * rotor;

const drillTransformed = drillBase.map((poly) =>
  poly.map((p) => motor >>> p)
);
```

Because the code builds `motor = translator * rotor`, the geometry is rotated first and then translated.

## Sweep Model

The ideal geometric sweep is

$$
\mathcal{S}_{\mathrm{ideal}} =
\bigcup_t \mathbf{M}(t)\,\mathcal{T}\,\widetilde{\mathbf{M}(t)}
$$

The current page does **not** animate that exact sweep. Instead it renders a simple box proxy:

$$
\mathcal{S}_{\mathrm{demo}}
\approx
[-(L+r),\,L+r] \times [-r,\,r] \times [-(d_s+\varepsilon),\,d_s+\varepsilon]
$$

That is why the red block does not grow over time and does not ride along with the spindle head.

```js
const cutVolume = makeSolidBox(
  cutTravel + drillRadius,
  drillRadius,
  stockParams.d + 0.01
);
```

`cutVolume` is created once outside the animation callback and then drawn unchanged on every frame.

## Interpretation

The attractive part for CAM is still the same:

$$
p'(t) = \mathbf{M}(t)\,p\,\widetilde{\mathbf{M}(t)}
$$

- every tool vertex follows the same rigid-motion rule
- rotation and translation are composed in one algebraic object
- the same pattern scales naturally toward richer toolpaths and multi-axis motion

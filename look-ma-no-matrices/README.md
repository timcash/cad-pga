# Look, Ma, No Matrices!

One motor stack moves a carrier body and its child sensor frame.

## References

- [Primer article](https://enkimute.github.io/LookMaNoMatrices/)
- [Source repo](https://github.com/enkimute/LookMaNoMatrices)

## Verification Note

This example is inspired by Steven De Keninck's matrix-free renderer article. It is **not** a port of the full renderer. The article derives coefficient-level CPU and GPU routines for motor composition, point transport, and basis-direction transport. This repo example stays at the ganja.js operator level so the geometric idea remains easy to inspect.

## Core Equations

Parent and child motions compose as one world motor:

$$
\begin{aligned}
P(x,y,z) &= \mathbf{e}_{123} + x\mathbf{e}_{032} + y\mathbf{e}_{013} + z\mathbf{e}_{021} \\
\mathbf{M}_{\mathrm{carrier}}(t) &= \mathbf{T}(t)\,\mathbf{R}_z(t)\,\mathbf{R}_y(t)\,\mathbf{R}_x(t) \\
\mathbf{M}_{\mathrm{sensor}}(t) &= \mathbf{M}_{\mathrm{carrier}}(t)\,\mathbf{M}_{\mathrm{local}}(t)
\end{aligned}
$$

The carrier frame is a motor-valued rigid motion. The child sensor frame is authored locally, then promoted into world space by multiplication with the carrier motor.

## Transport

Points and carried frame directions ride the same motor:

$$
\begin{aligned}
p'(t) &= \mathbf{M}(t)\,p\,\widetilde{\mathbf{M}(t)} \\
\hat{d}_x'(t) &= \mathbf{M}(t)\,\hat{d}_x\,\widetilde{\mathbf{M}(t)} \\
\hat{d}_y'(t) &= \mathbf{M}(t)\,\hat{d}_y\,\widetilde{\mathbf{M}(t)} \\
\hat{d}_z'(t) &= \mathbf{M}(t)\,\hat{d}_z\,\widetilde{\mathbf{M}(t)}
\end{aligned}
$$

The body edges, the sensor frustum, and the axis cues all represent the same rigid frame transport.

## In Code

```js
const carrierMotor =
  translate3(tx, ty, tz) *
  rotorZ(time * 0.72) *
  rotorY(0.45 * Math.sin(time * 0.9)) *
  rotorX(0.28 * Math.cos(time * 1.1));

const sensorLocalMotor =
  sensorMount *
  rotorY(0.38 * Math.sin(time * 1.7)) *
  rotorZ(0.24 * Math.cos(time * 1.25));

const sensorMotor = carrierMotor * sensorLocalMotor;

const sensorWorld = transformSegments(sensorFrustum, sensorMotor);
```

No `4x4` matrix is assembled here. The carrier transform, the child-local sensor mount, and the promoted world transform all remain motors from start to finish.

## Primer Connection

The article's high-level frame-stack claim can be summarized as

$$
\mathbf{M}_{\mathrm{world}} = \mathbf{M}_{\mathrm{parent}}\,\mathbf{M}_{\mathrm{child}}
$$

- rigid transforms are treated as motors
- world transforms are composed with the geometric product
- point and basis-direction transport are both matrix-free
- this repo example keeps the idea small by visualizing a body frame and sensor frame instead of a full renderer

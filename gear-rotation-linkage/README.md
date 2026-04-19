# Gear Hierarchy

Parent motion plus local motion gives one world transform.

## References

- [Look, Ma, No Matrices!](https://enkimute.github.io/LookMaNoMatrices/)
- [PGA Reference](https://bivector.net/PGA4CS.pdf)

## Verification Note

This example is deliberately small. The current code uses a lightweight SE(2)-style helper struct rather than full ganja.js multivectors. The math below reflects the code path first, then shows the PGA sandwich-product form as the conceptual analogue.

## Hierarchy Equations

The child is evaluated in the parent frame:

$$
\begin{aligned}
\phi_{\text{world}}(t) &= \phi_{\text{gear}}(t) + \phi_{\text{local}}(t) \\
t_{\text{world}}(t) &= t_{\text{gear}}(t) + R(\phi_{\text{gear}}(t))\,t_{\text{local}}(t) \\
p_{\text{world}} &= R(\phi_{\text{world}})\,p_{\text{local}} + t_{\text{world}}
\end{aligned}
$$

The orange arm is not given separate global coordinates. It inherits the gear motion and then contributes only its local offset and local oscillation.

## In Code

```js
function rotor(angle) {
  return { angle, tx: 0, ty: 0 };
}

function translator(x, y) {
  return { angle: 0, tx: x, ty: y };
}

function multiply(parent, local) {
  const cos = Math.cos(parent.angle);
  const sin = Math.sin(parent.angle);
  return {
    angle: parent.angle + local.angle,
    tx: parent.tx + cos * local.tx - sin * local.ty,
    ty: parent.ty + sin * local.tx + cos * local.ty
  };
}
```

The plugin version is a lightweight 2D rigid-transform model rather than a full 3D PGA implementation, but it preserves the same parent-local-world composition pattern.

## PGA Analogue

If those helper structs were replaced by PGA motors, the action would read

$$
P_{\text{new}} = M\,P\,\widetilde{M}
$$

That sandwich-product form is still the right conceptual bridge to the rest of the repo. It is just not the literal code path for this specific page.

```js
const mGear = rotor(gearAngle);
const mLocalOffset = translator(gearRadius - 0.2, 0);
const mLocalRotation = rotor(armLocalOscillation);
const mLocalArm = multiply(mLocalOffset, mLocalRotation);
const mWorldArm = multiply(mGear, mLocalArm);

const gearDrawn = baseGear.map((p) => applyMotor(mGear, p));
const armDrawn = baseArm.map((p) => applyMotor(mWorldArm, p));
```

## Why It Matters

- CAD assemblies are built from the same local-to-world inheritance pattern
- robot chains and linkages use the same composition logic at larger scale
- this 2D page is a good bridge between rigid-motion notation and the more complex 3D demos

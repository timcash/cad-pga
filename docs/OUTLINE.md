# CAD PGA Outline

This outline incorporates the bibliography and MathJax summary we discussed, in a repo-facing form. Most of the requested material already lived here, but this version now follows the same two-part structure more closely:

- Part 1: Verified Bibliography & Literature Links
- Part 2: Our Examples & Important PGA/CGA LaTeX Notation

When one of the originally supplied titles, links, or equations could not be verified exactly from the source record, that is called out explicitly rather than being repeated as if confirmed.

## Part 1: Verified Bibliography & Literature Links

### 1. Ganja.js (Geometric Algebra for JavaScript)

- Author: Steven De Keninck (Enki)
- Verified link: <https://github.com/enkimute/ganja.js>
- Why it is important: It is the foundational math engine for the examples in this repo. By overloading standard JavaScript operators, it lets developers write mathematical expressions that compile into efficient generated JavaScript.
- Connection to this repo: The HTML demos use this library to bypass standard \(4 \times 4\) matrix-heavy workflows and instead compute CAD intersections, rigid motions, and geometric queries with multivectors.

### 2. Bivector.net

- Authors: Leo Dorst, Steven De Keninck, Charles Gunn, et al.
- Verified link: <https://bivector.net/>
- Why it is important: It is the central public hub for the modern Projective Geometric Algebra (PGA) movement, including the SIGGRAPH-oriented notes, cheat sheets, and interactive educational material.
- Connection to this repo: The demo notation for points, lines, planes, motors, and sandwich actions follows the same 2D and 3D PGA conventions documented there, including the `Algebra(2,0,1)` and `Algebra(3,0,1)` style used in ganja.js examples.

### 3. "Clean up your Mesh! Part 1: Plane and simplex"

- Authors: Steven De Keninck, Martin Roelfs, Leo Dorst, David Eelbode
- Verified record: <https://arxiv.org/abs/2511.08058>
- Verified date: submitted November 11, 2025; revised November 14, 2025
- Why it is important: The paper studies plane-based PGA representations of simplices and complexes, and explains how lengths, areas, volumes, centers of mass, and inertia quantities can be expressed through Euclidean and ideal norms.
- Verification note: The originally supplied DOI `10.1098/rsta.2023.0116` and fallback arXiv link `2503.10451` could not be confirmed as the matching source for this exact title. The live arXiv record above is the verified source used in this repo.
- Connection to this repo: The mesh cleanup demo uses the same boundary-sum viewpoint: the gauge point changes the cone or fan decomposition, but not the signed area encoded by the oriented boundary.

### 4. Walk on Stars (WoS) / Monte Carlo PDEs

- Classic WoS source: <http://www.cs.fsu.edu/~mascagni/Muller_1956_Annals_Mathematical_Statistics.pdf>
- Modern WoSt project page: <https://www.cs.cmu.edu/~kmcrane/Projects/WalkOnStars/>
- Why it is important: Muller (1956) gives the classic Walk on Spheres idea for Dirichlet problems. Walk on Stars (Sawhney, Crane, et al., SIGGRAPH 2023) extends grid-free Monte Carlo PDE solving to more general mixed boundary conditions on complex geometry.
- Connection to this repo: The current `meshless-fea-wos` demo is closest to classic WoS. It combines the statistical walk loop with exact PGA wall-distance calculations for a Dirichlet heat problem. It does not yet implement the full visible-silhouette or star-domain machinery from the 2023 Walk on Stars paper.

### 5. Geometric Clifford Algebra Networks (GCANs)

- Authors: David Ruhe, Jayesh K. Gupta, Steven De Keninck, Max Welling, Johannes Brandstetter
- Verified link: <https://proceedings.mlr.press/v202/ruhe23a.html>
- Why it is important: It shows how multivector-valued representations can make learned systems naturally equivariant to rigid motions and other symmetry actions.
- Connection to this repo: It highlights the same future-facing idea behind the demos: once geometry and motion are encoded algebraically, downstream solvers and learning systems can reason about them more directly.

### 6. "Simulation of elastic rods using conformal geometric algebra"

- Authors: Elmar Brendel, Thomas Kalbe, Dietmar Hildenbrand, Michael Schafer
- Verified record: <https://publica.fraunhofer.de/handle/publica/359366>
- Verified venue and date: International Symposium on Frontiers of Computational Science (FCS) 2008
- Why it is important: The Fraunhofer abstract explicitly presents the work as a proof of concept that Geometric Algebra can improve Finite Element Methods, with elastic rod deformation as the target application and real-time behavior as a goal.
- Verification note: The original wording about TU Darmstadt, GAALOP, and specific rod-update equations goes beyond what is directly exposed in the verified Fraunhofer record. The record does verify the paper title, authors, year, conference, keywords, and abstract-level FEM claim. That is the basis used here.
- Connection to this repo: It is the strongest verified FEM-adjacent reference in the bibliography for the same high-level idea used throughout this repo: one algebraic object can carry both translational and rotational state.

## Part 2: Our Examples & Important PGA/CGA LaTeX Notation

### Example 1: The Base CAD Kernel (Planes & Intersections)

Concept: Replace ad hoc matrix-style intersection logic with meet operations between geometric primitives.

In 3D PGA, the meet of two planes \(P_1\) and \(P_2\) is a line \(L\):

$$
L = P_1 \wedge P_2
$$

If a third plane is introduced, their common intersection point is:

$$
p = P_1 \wedge P_2 \wedge P_3
$$

This is the right mental model for the repo's CAD-style examples: geometric incidence is encoded directly in the algebra rather than recovered from separate matrix solves.

### Example 2: Kinematic Gears & Scene Graph (Rigid Body Motors)

Concept: Use one motor to carry rotation and translation together.

For the current CNC demo, the spindle axis is the line \(\ell_z = \mathbf{e}_{12}\), and the x-translation generator is \(\mathbf{e}_{01}\). The code-level rotor, translator, and motor are:

$$
R_z(\theta) = \cos\left(\frac{\theta}{2}\right) + \sin\left(\frac{\theta}{2}\right)\ell_z
$$

$$
T_x(d_x) = 1 - \frac{d_x}{2}\mathbf{e}_{01}
$$

$$
M(t) = T_x(d_x(t)) R_z(\theta(t))
$$

The full rigid action on any point, line, plane, or polygon vertex is the sandwich product:

$$
X'(t) = M(t) X \widetilde{M(t)}
$$

Because the current code builds `motor = translator * rotor`, the geometry is rotated about its local spindle axis and then translated along x. This is the same unifying rigid-body pattern behind the CNC demo and the broader scene-graph interpretation of the repo's motion examples.

### Example 3: "Clean up your Mesh!" (Coordinate-Free Area)

Concept: The invariant quantity is the oriented boundary sum, not the sum of absolute cone-face areas.

Let the oriented polygon boundary be \(\partial K\), with edges

$$
E_i = p_i \vee p_{i+1}
$$

Then the full boundary is

$$
\partial K = \sum_{i=1}^{n} E_i
$$

For a gauge point \(o\), the joined plane sum is

$$
\Pi(o) = o \vee \partial K
$$

and the invariant area is

$$
A(K) = \frac{1}{2}\left\| \Pi(o) \right\|_{\infty}
$$

The red quantity shown in the demo is different:

$$
A_{\mathrm{abs}}(o) = \frac{1}{2}\sum_{i=1}^{n}\left\| o \vee E_i \right\|
$$

That absolute cone sum changes with the gauge point. The ideal-norm quantity does not.

### Example 4: Meshless FEA (PGA + WoS + SDF)

Concept: The current repo demo is a meshless harmonic heat solve driven by nearest-boundary distance queries.

Despite the route name `meshless-fea-wos`, the implemented problem is a 2D Dirichlet Laplace solve, not a full finite element assembly. The name is kept because it points at the FEM/PDE motivation, but the present code is best read as a meshless heat example.

For normalized wall lines \(\widehat{L}_i\) in 2D PGA, the wall distance is:

$$
d_{\mathrm{wall}}(P,\widehat{L}_i) = \left| (P \wedge \widehat{L}_i)\mathbf{e}_{012} \right|
$$

For the circular obstacle with radius \(r\), the signed distance is:

$$
d_{\mathrm{disk}}(x,y) = \sqrt{x^2 + y^2} - r
$$

The full nearest-boundary query used by the demo is:

$$
d(P,\partial \Omega) =
\min\left(
\min_i d_{\mathrm{wall}}(P,\widehat{L}_i),
\left| d_{\mathrm{disk}}(x,y) \right|
\right)
$$

Walk on Spheres then advances by

$$
X_{k+1} = X_k + d_k(\cos\theta_k, \sin\theta_k),
\qquad
\theta_k \sim \mathrm{Uniform}(0, 2\pi)
$$

with \(d_k = d(X_k,\partial\Omega)\). The harmonic solution is estimated by

$$
u(x) = \mathbb{E}\left[g\!\left(X_{\tau_{\partial \Omega}}\right)\mid X_0 = x\right]
$$

This is why the demo can stay meshless: it needs distance-to-boundary queries, not a stiffness matrix.

### Example 5: Elastic FEM Deformation (Elmar Brendel's CGA Approach)

Concept: Use one motor-valued state update to carry position and orientation together.

The verified Brendel reference supports the high-level idea that CGA can unify translational and rotational rod state inside an FEM-style deformation solver. A safe generic motor update, consistent with that idea, is:

$$
M_{k+1} = \exp\left(-\frac{1}{2} B_k\right) M_k
$$

where \(B_k\) is a bivector-valued twist or pose increment. Geometry is then updated by the same sandwich action used throughout PGA/CGA:

$$
X_{k+1} = M_{k+1} X_0 \widetilde{M_{k+1}}
$$

This is generic CGA/PGA motor notation, not a verbatim equation extracted from the Fraunhofer page. It is included here because it matches the paper's verified high-level claim: pose and rotation are updated as one algebraic object rather than split into unrelated pipelines.

## README Note

This bibliography and the longer MathJax summary live in `docs/OUTLINE.md`. The `README.md` only links to this file; it does not duplicate the full bibliography.

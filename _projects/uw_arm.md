---
layout: page
title: KNODE Underwater Arm
description: learning the hydrodynamics of underwater robotic arms with knowledge-based neural ODEs
img: assets/img/projects/academic/uw_arm_knode/comparison.png
importance: 1
category: academic
related_publications: true
---

Note: This project is unfinished due to my medical leave of absence from the University of Pennsylvania. The code is on GitHub <a href="https://github.com/AndrewMasker/KNODE_UW_ARM">here</a>, although it is also in an unfinished state. This page gives an overview of the problem and the mathematics behind the methods I compared, rather than a finished set of results.

### Useful Skills/Topics Learned

JAX, Equinox, Diffrax, MuJoCo, MJX, system identification, dynamical systems modeling, robotic control

### Background

Underwater robotic arms are useful across much of the underwater economy, including aquaculture, exploration, polymetallic nodule harvesting, and infrastructure construction and maintenance. Their use is hampered by the unmodeled dynamics of the surrounding fluid, which often leads to overly stiff controllers that are power hungry on energy-limited mobile platforms. A controller that does not know how the water will push back on the arm has to fight it with high gains instead of anticipating it.

Unfortunately, the effects of the surrounding fluid cannot be solved for directly with a computational method such as a finite element or finite volume simulation. Aside from the fact that real-time simulation would be extremely costly and likely infeasible on a power-limited machine, the lack of a well-defined domain, boundary conditions, and knowledge of the local motion of the fluid at any point in time would make a useful forward simulation impossible.

Given that a direct simulation of the fluid is out of the question, one may look for an appropriate lower-dimensional model of the system that can be integrated into the control strategy. To see what such a model has to capture, it helps to start with the dynamics of the arm itself.

### Manipulator Dynamics

The rigid-body dynamics of an $$n$$-joint serial manipulator with joint angles $$\mathbf{q} \in \mathbb{R}^n$$ and joint torques $$\boldsymbol{\tau} \in \mathbb{R}^n$$ are given by the manipulator equation,

$$
\mathbf{M}(\mathbf{q})\ddot{\mathbf{q}} + \mathbf{C}(\mathbf{q}, \dot{\mathbf{q}})\dot{\mathbf{q}} + \mathbf{g}(\mathbf{q}) = \boldsymbol{\tau},
$$

where $$\mathbf{M}(\mathbf{q})$$ is the configuration-dependent mass (inertia) matrix, $$\mathbf{C}(\mathbf{q}, \dot{\mathbf{q}})\dot{\mathbf{q}}$$ collects the Coriolis and centrifugal terms, and $$\mathbf{g}(\mathbf{q})$$ is the gravity term. For the Franka Emika Panda used here, $$n = 7$$. Defining the state as $$\mathbf{x} = [\mathbf{q}^\top, \dot{\mathbf{q}}^\top]^\top \in \mathbb{R}^{2n}$$ and the control input as $$\mathbf{u} = \boldsymbol{\tau}$$, we can rewrite this as a first-order ODE,

$$
\dot{\mathbf{x}} = \mathbf{f}(\mathbf{x}, \mathbf{u}) =
\begin{bmatrix}
    \dot{\mathbf{q}} \\
    \mathbf{M}(\mathbf{q})^{-1}\left(\boldsymbol{\tau} - \mathbf{C}(\mathbf{q}, \dot{\mathbf{q}})\dot{\mathbf{q}} - \mathbf{g}(\mathbf{q})\right)
\end{bmatrix}.
$$

In air, every term on the right-hand side is well known from the arm's geometry and mass properties. Underwater, the fluid exerts an additional generalized force $$\boldsymbol{\tau}_h$$ on the joints,

$$
\mathbf{M}(\mathbf{q})\ddot{\mathbf{q}} + \mathbf{C}(\mathbf{q}, \dot{\mathbf{q}})\dot{\mathbf{q}} + \mathbf{g}(\mathbf{q}) = \boldsymbol{\tau} + \boldsymbol{\tau}_h,
$$

and $$\boldsymbol{\tau}_h$$ is the whole problem. The most applicable classical models, borrowed from marine vehicle dynamics, break it into added mass, drag, and buoyancy,

$$
\boldsymbol{\tau}_h \approx -\mathbf{M}_A(\mathbf{q})\ddot{\mathbf{q}} - \mathbf{C}_A(\mathbf{q}, \dot{\mathbf{q}})\dot{\mathbf{q}} - \mathbf{D}(\mathbf{q}, \dot{\mathbf{q}})\dot{\mathbf{q}} - \mathbf{g}_B(\mathbf{q}).
$$

The added mass $$\mathbf{M}_A$$ accounts for the fluid that has to be accelerated along with the arm, $$\mathbf{D}$$ contains linear and quadratic drag, and $$\mathbf{g}_B$$ is the buoyancy-induced restoring torque. In practice, each link is approximated as a simple shape such as a cylinder, box, or ellipsoid, the force on each link is estimated with something like the Morison equation,

$$
\mathbf{f}_i = \rho C_{M,i} V_i \, \mathbf{a}_i + \tfrac{1}{2} \rho C_{D,i} A_i \, \lVert \mathbf{v}_i \rVert \, \mathbf{v}_i,
$$

and these forces are mapped back to joint space through the link Jacobians, $$\boldsymbol{\tau}_h = \sum_i \mathbf{J}_i(\mathbf{q})^\top \mathbf{f}_i$$. Here $$\rho$$ is the fluid density, $$V_i$$ and $$A_i$$ are the volume and projected area of link $$i$$, $$\mathbf{v}_i$$ and $$\mathbf{a}_i$$ are its velocity and acceleration, and $$C_{M,i}$$ and $$C_{D,i}$$ are empirical inertia and drag coefficients.

These models are enough to gain some benefit, but they leave much to be desired. The coefficients depend on the geometry, orientation, and Reynolds number of each link; neighboring links shadow and disturb the flow around one another; and the wake shed by the arm gives the fluid states of its own, so the force at any instant depends on the history of the motion and not just on $$\mathbf{x}$$. Each of these is a small effect on its own, but they compound in the context of a dynamical system that is integrated forward in time.

As such, one may wish to take a data-driven approach, where a model of the system is learned from trajectories of the arm operating within the fluid. Given a dataset of $$N$$ trajectories sampled at times $$t_k$$,

$$
\mathcal{D} = \left\{ \left(\mathbf{x}_j(t_k), \mathbf{u}_j(t_k)\right) \right\}_{j = 1, \dots, N; \ k = 0, \dots, K},
$$

the goal is to find a model $$\hat{\mathbf{f}}$$ such that integrating $$\dot{\mathbf{x}} = \hat{\mathbf{f}}(\mathbf{x}, \mathbf{u})$$ from $$\mathbf{x}_j(t_0)$$ reproduces the observed trajectories. Several methods can do this, including Sparse Identification of Nonlinear Dynamics (SINDy), Gaussian Processes (GPs), and Neural Ordinary Differential Equations (NODEs).

### Sparse Identification of Nonlinear Dynamics (SINDy)

<a href="https://www.pnas.org/doi/10.1073/pnas.1517384113">SINDy</a> assumes that the dynamics can be written as a sparse linear combination of terms drawn from a user-defined dictionary of candidate functions. Stacking $$m$$ snapshots of the state and input into matrices $$\mathbf{X}$$ and $$\mathbf{U}$$, along with the corresponding time derivatives $$\dot{\mathbf{X}}$$, one builds a library matrix

$$
\boldsymbol{\Theta}(\mathbf{X}, \mathbf{U}) =
\begin{bmatrix}
    \mathbf{1} & \mathbf{X} & \mathbf{U} & \mathbf{X}^{P_2} & \cdots & \sin(\mathbf{X}) & \cos(\mathbf{X}) & \cdots
\end{bmatrix} \in \mathbb{R}^{m \times p},
$$

where each column is one candidate function evaluated at every snapshot (e.g., $$\mathbf{X}^{P_2}$$ contains all quadratic monomials of the state). The dynamics are then modeled as

$$
\dot{\mathbf{X}} \approx \boldsymbol{\Theta}(\mathbf{X}, \mathbf{U}) \, \boldsymbol{\Xi},
$$

where $$\boldsymbol{\Xi} = [\boldsymbol{\xi}_1, \dots, \boldsymbol{\xi}_{2n}] \in \mathbb{R}^{p \times 2n}$$ is a matrix of coefficients that we want to be sparse. Each column is found by solving a regularized regression problem, such as

$$
\boldsymbol{\xi}_k = \underset{\boldsymbol{\xi}}{\arg\min} \ \left\lVert \dot{\mathbf{X}}_k - \boldsymbol{\Theta}(\mathbf{X}, \mathbf{U}) \boldsymbol{\xi} \right\rVert_2^2 + \lambda \lVert \boldsymbol{\xi} \rVert_1,
$$

or, more commonly, with sequentially thresholded least squares, which alternates between a least-squares fit and zeroing out every coefficient whose magnitude falls below some threshold. The sparsity is what makes SINDy attractive: the result is a short, interpretable equation, and the regression is cheap compared to training a neural network.

SINDy works incredibly well when the true dynamics are a sparse combination of the terms in the dictionary, but it often fails when the dictionary is not expressive enough. A robotic arm is a good example of this. Because the arm consists of rotational joints, the entries of $$\mathbf{M}(\mathbf{q})$$, $$\mathbf{C}$$, and $$\mathbf{g}$$ are polynomials in sines and cosines of the joint angles, so a Fourier-type library (the "Fourier basis SINDy" in the comparison below) seems like a natural choice. The problem is the inverse of the mass matrix in the expression for $$\ddot{\mathbf{q}}$$. Even for a simple two-link planar arm, the mass matrix has the form

$$
\mathbf{M}(\mathbf{q}) =
\begin{bmatrix}
    \alpha + 2\beta\cos q_2 & \delta + \beta\cos q_2 \\
    \delta + \beta\cos q_2 & \delta
\end{bmatrix},
\qquad
\det \mathbf{M} = \alpha\delta - \delta^2 - \beta^2\cos^2 q_2,
$$

for constants $$\alpha, \beta, \delta$$ that depend on the link masses and lengths. Every entry of $$\mathbf{M}^{-1}$$ is divided by $$\det \mathbf{M}$$, so the joint accelerations are rational functions of trigonometric terms. A function like $$1/(\alpha\delta - \delta^2 - \beta^2\cos^2 q_2)$$ has an infinite Fourier series, so it cannot be represented exactly, or even sparsely, by a finite trigonometric library. With seven joints, the determinant couples nearly every joint angle together, and the problem only gets worse once the fluid adds its own configuration-dependent added mass to $$\mathbf{M}$$. Implicit formulations such as <a href="https://arxiv.org/abs/2004.02322">SINDy-PI</a> can sidestep rational dynamics in some cases, but the number of candidate terms still grows combinatorially with the number of joints.

There is also a more practical issue: SINDy regresses against $$\dot{\mathbf{X}}$$, which is usually not measured directly and has to be estimated by numerically differentiating noisy state measurements, which amplifies that noise. For both of these reasons, SINDy is an ill fit for this problem.

### Gaussian Processes

GPs take a probabilistic approach, placing a prior over the space of functions and conditioning on the data to get a non-parametric model with built-in uncertainty estimates. They are very effective for low-dimensional systems with modest amounts of data, but exact GP regression scales cubically with the number of data points, which conflicts with the temporally dense data that can be gathered from a robotic arm, and common stationary kernels struggle to generalize in a state-action space as large as ours. For the purposes of this page, GPs serve as a baseline in the comparison below.

### Neural Ordinary Differential Equations (NODEs)

The best sort of model would be one with the generality of GPs and the scalability and simplicity of SINDy, which is where <a href="https://arxiv.org/abs/1806.07366">Neural Ordinary Differential Equations</a> (NODEs) become useful. A NODE parameterizes the right-hand side of the ODE with a neural network $$\mathbf{f}_\theta$$ that maps the state and input to the time derivative of the state,

$$
\dot{\mathbf{x}} = \mathbf{f}_\theta(\mathbf{x}, \mathbf{u}).
$$

A predicted trajectory is obtained by integrating the network forward with a standard ODE solver,

$$
\hat{\mathbf{x}}(t) = \mathbf{x}(t_0) + \int_{t_0}^{t} \mathbf{f}_\theta\left(\hat{\mathbf{x}}(\tau), \mathbf{u}(\tau)\right) \mathrm{d}\tau,
$$

and the network is trained by minimizing the error between the predicted and measured trajectories,

$$
\mathcal{L}(\theta) = \sum_{j=1}^{N} \sum_{k=1}^{K} \left\lVert \hat{\mathbf{x}}_j(t_k) - \mathbf{x}_j(t_k) \right\rVert_2^2.
$$

Note that, unlike SINDy, the loss compares states rather than derivatives, so no numerical differentiation of the data is required, and the model is trained on exactly what we care about: how well it predicts the future.

The only difficulty is computing $$\mathrm{d}\mathcal{L}/\mathrm{d}\theta$$ through the ODE solver. One option is to backpropagate directly through the internal operations of the solver (discretize-then-optimize), which is exact but requires storing the intermediate states. The other is the adjoint method (optimize-then-discretize), which defines the adjoint state $$\mathbf{a}(t) = \partial \mathcal{L} / \partial \hat{\mathbf{x}}(t)$$ and solves a second ODE backwards in time,

$$
\frac{\mathrm{d}\mathbf{a}(t)}{\mathrm{d}t} = -\mathbf{a}(t)^\top \frac{\partial \mathbf{f}_\theta}{\partial \mathbf{x}},
\qquad
\frac{\mathrm{d}\mathcal{L}}{\mathrm{d}\theta} = \int_{t_0}^{t_K} \mathbf{a}(t)^\top \frac{\partial \mathbf{f}_\theta}{\partial \theta} \, \mathrm{d}t,
$$

with $$\mathbf{a}$$ receiving a jump of $$\partial \mathcal{L} / \partial \hat{\mathbf{x}}(t_k)$$ at each observation time. This requires only constant memory in the length of the trajectory, at the cost of an extra backward solve. Both approaches only need vector-Jacobian products of $$\mathbf{f}_\theta$$, which automatic differentiation provides for free.

NODEs share many of the benefits of SINDy and GPs: they are general, they do not require the user to supply a dictionary or kernel, and they are well suited to the dense time series that can be gathered from robotic arms. They do, however, struggle with high-dimensional systems when the data is sparse in the state space, which it almost always is for something like a robotic arm. For the Panda, the network takes a 21-dimensional input (14 states and 7 torques), and even a large set of trajectories only covers a set of thin curves through that space. A plain NODE also has to learn the entire rigid-body dynamics from scratch, including the inverse mass matrix and gravity terms that we already know very well, in addition to the fluid effects that we actually care about. There is an implicit tension between the expressivity of the network and overfitting, which is compounded by the juxtaposition of sparse samples and complex, highly nonlinear dynamics.

### Knowledge-Based Neural ODEs (KNODE)

To get the benefits of NODEs with a realistic system such as ours, one must include some prior that reduces the complexity of what has to be learned. <a href="https://arxiv.org/abs/2010.03415">Knowledge-based neural ODEs</a> (KNODE), developed at Penn's GRASP Laboratory, do exactly this by combining a nominal model derived from first principles with a neural network. In its general form, a KNODE couples the two through some coupling function $$\mathcal{M}_c$$,

$$
\dot{\mathbf{x}} = \mathcal{M}_c\left( \tilde{\mathbf{f}}(\mathbf{x}, \mathbf{u}), \ \mathbf{f}_\theta(\mathbf{x}, \mathbf{u}) \right),
$$

where $$\tilde{\mathbf{f}}$$ is the nominal model. The most common choice, used for example in <a href="https://arxiv.org/abs/2109.04821">KNODE-MPC</a> for quadrotors, is a simple additive residual,

$$
\dot{\mathbf{x}} = \tilde{\mathbf{f}}(\mathbf{x}, \mathbf{u}) + \mathbf{f}_\theta(\mathbf{x}, \mathbf{u}).
$$

For an underwater arm, the nominal model is simply the rigid-body dynamics of the arm in air, which we know very well from its geometry and mass properties. The network is then only responsible for the discrepancy between the nominal model and reality, which is dominated by the hydrodynamic effects. Since the fluid enters the manipulator equation as a generalized force, it is also natural to place the residual at the torque level rather than directly on $$\dot{\mathbf{x}}$$,

$$
\dot{\mathbf{x}} =
\begin{bmatrix}
    \dot{\mathbf{q}} \\
    \mathbf{M}(\mathbf{q})^{-1}\left(\boldsymbol{\tau} - \mathbf{C}(\mathbf{q}, \dot{\mathbf{q}})\dot{\mathbf{q}} - \mathbf{g}(\mathbf{q}) + \boldsymbol{\tau}_\theta(\mathbf{q}, \dot{\mathbf{q}}, \boldsymbol{\tau})\right)
\end{bmatrix},
$$

which keeps the kinematic relationship between $$\mathbf{q}$$ and $$\dot{\mathbf{q}}$$ exact and lets the known mass matrix handle the rational trigonometric structure that gave SINDy so much trouble. Either way, the residual is much smaller and simpler than the full dynamics, so it can be learned with a smaller network and less data. Just as importantly, the nominal model supplies the correct structure in regions of the state space that the training data never visited, so predictions there degrade gracefully toward the physics-based model instead of toward whatever the network happens to output.

Training a KNODE works exactly like training a NODE, except that gradients now have to pass through $$\tilde{\mathbf{f}}$$ as well as $$\mathbf{f}_\theta$$, since both appear inside the ODE. That means the nominal model must be differentiable, which is why the rigid-body dynamics here come from <a href="https://mujoco.readthedocs.io/en/stable/mjx.html">MJX</a>, the JAX implementation of MuJoCo. MJX can be differentiated, just-in-time compiled, and vectorized over many trajectories at once, so the entire hybrid model can be integrated and trained end-to-end on a GPU.

### Results

Fig. 1 shows a comparison of the end point of a trajectory for the ground truth, KNODE, Fourier basis SINDy, a GP, and the nominal model. The nominal model, which neglects the fluid entirely, drifts the furthest from the ground truth, and the SINDy and GP models land somewhere in between. The KNODE prediction nearly overlaps the ground truth.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/uw_arm_knode/panda_comp_traj_2_end.png" title="Trajectory end point comparison" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/uw_arm_knode/panda_comp_traj_2_top.png" title="Trajectory end point comparison, top view" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig. 1. Comparison of the end point of a trajectory (left) and the same end point from above (right) for the ground truth (white), KNODE (green), Fourier basis SINDy (orange), GP (blue), and the nominal model (red).
</div>

The natural next step, and the original motivation for the project, was to use the learned model inside a model-based controller such as model predictive control, following the approach of KNODE-MPC, so that the controller can anticipate the fluid forces rather than overpowering them with stiff gains. Unfortunately, due to my medical leave of absence, I was unable to continue work on this project.

### Implementation

This project was implemented in <a href="https://github.com/jax-ml/jax">JAX</a>, using <a href="https://github.com/patrick-kidger/equinox">Equinox</a> and <a href="https://github.com/patrick-kidger/diffrax">Diffrax</a> as the neural network and differential equation libraries, respectively. The nominal model of the arm came from <a href="https://mujoco.org/">MuJoCo</a>, with MJX providing the differentiable implementation used during training.

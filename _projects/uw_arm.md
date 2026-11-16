---
layout: page
title: KNODE Underwater Arm
description: enabling underwater robotic arms to account for the effects of surrounding fluid
img: assets/img/projects/academic/uw_arm_knode/comparison.png
importance: 1
category: academic
related_publications: true
---

Note: This project is unfinished due to my medical leave of absence from the University of Pennsylvania. The github is <a href="https://github.com/AndrewMasker/KNODE_UW_ARM">here</a>, although it is also in an unfinished state.

### Useful Skills/Topics Learned

Jax, Equinox, Diffrax, Mujoco, MJX, Systems Modelling, Robotic Control

### BACKGROUND

Underwater robotic arms are useful in many parts of the underwater economy; including things like aquaculture, exploration, polymetallic nodule harvesting, infrastructure maintenance and construction, and more. The use of underwater arms is hampered by the unmodelled dynamics of the surrounding fluid; often leading to overly stiff controllers which are power hungry on energy limited mobile platforms. 

Unfortunately, the effects of the surrounding fluid cannot be directly solved for using some computational method such as a finite element simulation. Aside from the fact that real time simulation would be extremely costly and likely infeasible on a power limited machine, the lack of a well-defined domain, boundary conditions, and knowledge of the local motion of the fluid at any point in time would make a useful forward simulation impossible.

Given that a direct simulation of the fluid is likely impossible, one may look for an appropriate lower dimensional model of the system which could then be integrated into the control strategy. Unfortunately, the most applicable models like added mass, simple box or ellipsoid drag, and others leave much to be desired. They are enough to gain some benefit, but do not take into account the geometry of a robotic arm, additional states the fluid may have, and many other smaller effects that nevertheless compound in the context of a dynamical system.

As such, one may wish to take a data driven approach, where a system model is learned from trajectories of the arm operating within the fluid. There are several methods that are capable of doing so, such as Sparse Identification of Nonlinear Dynamical Systems (SINDy) and Gaussian Processes (GPs). 

SINDy works by utilizing a user defined dictionary of nonlinear dynamical terms, which are then linearly combined with a sparse weighted sum; the weights of the sum are optimized with one of many methods, including gradient descent or with least squares. While SINDy works incredibly well when the true dynamics are a linear combination of the terms within the user defined dictionary, it often fails when the dictionary is not expressive enough. In the case of a robotic arm, in most coordinate systems, the true dynamics are a composition of trigonometric functions, which are not cleanly split into component parts which could be linearly combined to form the true dynamics. This means that SINDy is an ill fit for this problem.

Gaussian processes are a different method of system or function modelling that take a more statistical approach to system modelling by assuming the data fits some Gaussian distribution, which the technique then attempts to model non-parametricly. The actual details are a little more complicated than that, but the important part is that GPs assume the system fits onto a Gaussian distribution, which ours does not. Furthermore, GPs are not naturally suited to high dimensional systems like a robotic arm, nor are they particularly efficient when it comes to densely sampled data.

The best sort of system would be one with the generality of GPs, but the high dimensional suitability and simplicity of SINDy, which is where Neural Ordinary Differential Equations (NODEs) become useful. NODEs parameterize an ordinary differential equation as a neural network which maps from state to state velocity. The neural network can then be trained using adjoint methods to accurately forward predict trajectories. NODEs have a lot of benefits of SINDy and GPs, such as their generality and lack of input. They are also suited for the kinds of temporally dense data that can be gathered from robotic arms. They do struggle with high dimensional systems when the data is sparse in the state space, which it almost always is in a high dimensional system like a robotic arm. There is also an implicit conflict between expressivity of a neural network and overfitting, which is compounded by the juxtaposition between sparse samples and complex, highly nonlinear dynamics. 

To enable us to get the benefits of NODEs with a realistic system such as ours, one must include some prior that will reduce the complexity of the system to be learned. Fill in stuff about KNODE

Below you can see a comparison of the end point of a trajectory for the ground truth, KNODE, fourier basis SINDy, Gaussian Process, and the nominal model.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/uw_arm_knode/panda_comp_traj_2_end.png" title="PIV example" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/uw_arm_knode/panda_comp_traj_2_top.png" title="PIV example, processed" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig. 1. A comparison of the end point of a trajectory for the ground truth (white), KNODE (green), fourier basis SINDy (orange), Gaussian Process (blue), and the nominal model (red)
</div>

Unfortunately, due to my medical leave of absence, I was unable to continue work on this project.

### Implementation

This project was implemented in jax, using equinox and diffrax as the ML and differential equations libraries respectively. The robotic nominal model and 

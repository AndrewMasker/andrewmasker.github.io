---
layout: page
title: Neural Optical Flow
description: a neural implicit optical flow methodology
img: assets/img/projects/academic/neural_optical_flow/nof.jpg
importance: 1
category: academic
related_publications: true
---

Note: If at any point you want more details in a more academic style, see our journal paper on this topic {% cite masker2025neural %} or take a look at my undergraduate thesis {% cite masker2025thesis %}. The content of this page provides an overview of the topic and glazes over most rigorous details.

### Background

The measurement of fluid fields such as velocity, vorticity, and density is critical for the engineering process
when it comes to fluid based applications. Unfortunately, direct measurement with physical probes is limited to very sparse sampling
of the field due to the cost of probes and the fact that they disrupt the fluid, which leads to uncertainty about the veracity of the results.

As such, more indirect methods of measurement are required. One such method is Particle Image Velocimetry, wherein a fluid is seeded 
with particles small enough that they follow the movement of the fluid and by which snapshots of the flow can be imaged. A laser sheet illuminates a slice of the physical domain, such that particles at different depths do not conflict in their image space motions. Successive images of the particles moving in the fluid can then be used to reconstruct the velocity field as seen below in Fig. 1.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/neural_optical_flow/Impinging_PIV_Smaller.gif" title="PIV Example" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/neural_optical_flow/Impinging_PIV_Smaller_Result.jpg" title="PIV Example Processed" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 1. PIV Example. Right is processed from Left with <a href="https://pixlane.media/optical-flow/">pixlane</a>. Credit Left: <a href="https://daniel.edgington-mitchell.com/how-it-works/particle-image-velocimetry/">Dr. Daniel Edgington-Mitchell</a>.
</div>

Aside from imaging techniques, the most difficult aspect of PIV is converting two consecutive images of particles being advected within a flow into the
underlying velocity field. This is of course a difficult prospect given the fact that particles are represented by patches of bright pixels with no association
between images rather than any sort of discrete point with a connection between images. While there are myriad methods to process PIV images into velocity fields, two main techniques exist at the forefront. 

### Cross Correlation

The first and older method is Cross Correlation (CC), pictured below in Fig. 2. In this method, the first and second images of a successive pair are each broken into interrogation windows. Matching pairs of interrogation windows across images are then cross correlated by computing the dot product of image one's window and a version of image two's window shifted by some offset. By computing this cross correlation at every offset of image two's window (within some bounds), one can make a mapping from discrete pixel offsets to the correlation between the windows. The offset with the maximum correlation is the one corresponding to how far image one's window was advected by the flow field. From that pixel offset, one can then work out a physical offset and with a time step can find the velocity. 

Cross Correlation is widely used given its mathematical simplicity, robustness, and ability to handle large particle displacements. The main drawback is that each window receives a single velocity vector, which can coarsen the resolution of the velocity field by a factor of 32 to 64 as compared to the underlying images and severely smooth the velocity field compared to reality. That drawback can be mitigated somewhat by repeating the process with increasingly smaller windows, using previous flow estimations as a prior to decrease the noise and inaccuracy that normally comes from smaller windows. It is also quite costly, requiring many FFT calculations in the standard approach.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/neural_optical_flow/Cross_Correlation_Animation.gif" title="Cross Correlation Example" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 2. Cross Correlation Example Animation. Credit <a href="https://commons.wikimedia.org/wiki/File:Cross_Correlation_Animation.gif">Fzigunov</a>.
</div>

### Optical Flow

The other main method is Optical Flow (OF), in which it is assumed that the total intensity (pixel brightness) is conserved when image one is advected by the flow field into image two. If we think of the discrete images as continuous fields in space and time, that statement of intensity conservation can be written formally as

$$
I(\mathbf{x} , t) = I\left(\mathbf{x} + \int_t^{t + \Delta t} \mathbf{v}(\mathbf{x} , t) \delta t, \ t + \Delta t\right).
$$


<div class="row justify-content-sm-center">
    <div class="col-sm-8 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/projects/academic/neural_optical_flow/Optical_Flow.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 3. Optical Flow Visualization
</div>

A nonlinear inverse problem such as this has traditionally been very difficult to solve. As such, the first order Taylor series approximation of the right side can be taken to get

$$
I(\mathbf{x} , t) = I(\mathbf{x} , t) + \frac{\partial I}{\partial \mathbf{x}} \cdot \mathbf{v} + \frac{\partial I}{\partial t}.
$$

After cancelling like terms and rewriting in terms of components rather than vectors we get the linear approximation

$$
\frac{\partial I}{\partial t} = -\left(v_x \frac{\partial I}{\partial x} + v_y \frac{\partial I}{\partial y}\right)
$$

which essentially states that the rate of change in intensity at a point is equal to the rate that intensity being advected away by the velocity field. This step makes it possible to solve for velocity with simple gradient based methods (<a href="https://en.wikipedia.org/wiki/Horn%E2%80%93Schunck_method">Horn and Schunck</a>) or, with some more assumptions, with least squares (<a href="https://en.wikipedia.org/wiki/Lucas%E2%80%93Kanade_method">Lucas Kanade</a>), at the detriment of accuracy when the flow produces large particle steps, which are often not linear.

<div class="row justify-content-sm-center">
    <div class="col-sm-8 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/projects/academic/neural_optical_flow/OF_Linear.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 4. Linear Optical Flow Visualization
</div>

We can directly measure $$\frac{\partial I}{\partial t}$$ at every pixel by taking the pixel-wise difference of the two images and dividing by the time step. Similarly, the two gradients can be calculated at every pixel using finite difference methods. That leaves us with the two unknown components of the fluid velocity field $$v_x$$ and $$v_y$$. Given that we only have a single equation and one unknown, some other equation must be used to make the well-conditioned. These equations could impose a divergence free constraint as

$$
0 = \frac{\partial v_x}{\partial x} + \frac{\partial v_y}{\partial y}
$$

or a smoothness term like the Horn-Schunck regularizer 

$$
0 = \int \left(|\nabla v_x|^2 + |\nabla v_y|^2 \right) \mathrm{d}A.
$$

One may use some combination of additional terms to gain a more well-behaved result. Interestingly enough, unlike many problems that are ill-conditioned, it is actually quite easy to *see* the ill-conditioned nature of this problem with the Tikz Aperture visualization. Here you can see that being able to observe the motion at just a point (or in this case through the aperture with a repeating pattern), is not enough to deduce the actual underlying motion. As seen below.

<div class="row justify-content-sm-center">
    <div class="col-sm-5 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/projects/academic/neural_optical_flow/aperature_hidden.gif" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="row justify-content-sm-center">
    <div class="col-sm-5 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/projects/academic/neural_optical_flow/aperature_revealed.gif" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 5. Aperture Problem Visualization of Optical Flow Ill-Posedness. <a href="https://cdn.sinauer.com/wolfe4e/wa08.02.html">Credit</a>.
</div>

Optical flow addresses many of the issues with cross correlation, such as a higher, image quality resolution, and lower computational cost. Like all methods, it also has drawbacks. One such drawback is the that the maximum distance that a pixel can advect is very small, often limited to low single or even sub one pixel steps. This is primarily due to the linear approximation, which breaks down as particles move greater distances. It is often difficult to image a flow fast enough to ensure that a particle only moves such a short distance. The other big limitation of optical flow in the context of PIV is that particles are generally somewhat sparse, while optical flow works the best with continuous, fields where there is some amount of intensity everywhere. That concern is somewhat mitigated with the use of smoothing functions to "bridge the gaps" between particles, rather than having the field become very noisy.

### Neural Optical Flow

Neural Optical Flow (NOF) is a method that builds upon optical flow using neural implicit methods. Rather than using the discrete pixel grid as the basis for the velocity field as with OF and CC, i.e. a single velocity vector per pixel, NOF uses a <a href="https://en.wikipedia.org/wiki/Neural_field">neural field</a> as the basis for the velocity field. That essentially means that a neural network $$\mathcal{N}_\theta$$ represents the velocity field as

$$
\mathbf{v}(\mathbf{x}) = \mathcal{N}_\theta(\mathbf{x})
$$

or as

$$
\mathbf{v}(\mathbf{x} , t) = \mathcal{N}_\theta(\mathbf{x} , t)
$$

in the case of a time varying field.

The main benefit of this is that it enables us to use gradient descent to train the neural network to solve the full **nonlinear** optical flow problem. The process is conceptually much simpler than cross correlation, Horn-Schunck, Lucas-Kanade, and especially some of the newer methods like wavelet optical flow (introduced by <a href="https://link.springer.com/article/10.1023/A:1008101718719">Wu</a> and developed by <a href="https://inria.hal.science/hal-00737566/document">Dérian</a>). The main idea is to simply find some way to use the velocity field to warp image one into an approximation of image two, then take the error of that approximation with respect to the actual image two, and use that error to train the neural network.

The first step of achieving this is by sampling the intensity of image one $$I(t)$$ at a great many points, thus forming a new basis for the image as an array of points paired with their intensity 

$$
I_\mathcal{A}(t) = 
\begin{bmatrix}
    \mathbf{x}_0(t) & I(\mathbf{x}_0(t) , t) \\
    \mathbf{x}_1(t) & I(\mathbf{x}_1(t) , t) \\
    \mathbf{x}_2(t) & I(\mathbf{x}_2(t) , t) \\
    \vdots & \vdots
\end{bmatrix}
$$ 

That image can then be warped by the approximate velocity field $$\mathcal{N}_\theta : (\mathbf{x} , t) \mapsto \mathbf{v}$$ using a multi step <a href="https://en.wikipedia.org/wiki/Euler_method">Euler integration</a> to advect the points while carrying their intensity along for the ride. After advecting the points, we have our approximation of image two as

$$
I_{\mathcal{A}, \mathrm{advected}}(t) = 
\begin{bmatrix}
    \mathbf{x}_0\left(t\right) + \int_t^{t + \Delta t}\mathbf{v}\left(\mathbf{x}_0\left(\tau\right) , \tau\right) \mathrm{d}\tau & I\left(\mathbf{x}_0\left(t\right) , t\right) \\
    \mathbf{x}_1\left(t\right) + \int_t^{t + \Delta t}\mathbf{v}\left(\mathbf{x}_1\left(\tau\right) , \tau\right) \mathrm{d}\tau & I\left(\mathbf{x}_1\left(t\right) , t\right) \\
    \mathbf{x}_2\left(t\right) + \int_t^{t + \Delta t}\mathbf{v}\left(\mathbf{x}_2\left(\tau\right) , \tau\right) \mathrm{d}\tau & I\left(\mathbf{x}_2\left(t\right) , t\right) \\
    \vdots & \vdots
\end{bmatrix} 
\approx I_\mathcal{A}\left(t + \Delta t\right).
$$ 

We can then get the actual image two in the array basis by sampling image two at the advected points to get

$$
I_\mathcal{A}\left(t + \Delta t\right) = 
\begin{bmatrix}
    \mathbf{x}_0\left(t\right) + \int_t^{t + \Delta t}\mathbf{v}\left(\mathbf{x}_0\left(\tau\right) , \tau\right) \mathrm{d}\tau & I\left(\mathbf{x}_0\left(t\right) + \int_t^{t + \Delta t}\mathbf{v}\left(\mathbf{x}_0\left(\tau\right) , \tau\right), t\right) \\
    \mathbf{x}_1\left(t\right) + \int_t^{t + \Delta t}\mathbf{v}\left(\mathbf{x}_1\left(\tau\right) , \tau\right) \mathrm{d}\tau & I\left(\mathbf{x}_1\left(t\right) + \int_t^{t + \Delta t}\mathbf{v}\left(\mathbf{x}_1\left(\tau\right) , \tau\right), t\right) \\
    \mathbf{x}_2\left(t\right) + \int_t^{t + \Delta t}\mathbf{v}\left(\mathbf{x}_2\left(\tau\right) , \tau\right) \mathrm{d}\tau & I\left(\mathbf{x}_2\left(t\right) + \int_t^{t + \Delta t}\mathbf{v}\left(\mathbf{x}_2\left(\tau\right) , \tau\right), t\right) \\
    \vdots & \vdots
\end{bmatrix}.
$$ 

After that, the loss is calculated based on the difference between the advected intensity $$I_{\mathcal{A}, advected}(t)$$ and the actual intensity $$I_\mathcal{A}(t+\Delta t)$$. A visual is found below. 

Working with the full nonlinear equations means that NOF can produce high quality results for extremely large displacements within highly nonlinear and turbulent flows, up to 15 or more pixels. The implicit regularization of a neural basis also means that smoothing functions are generally not required despite the ill-posedness of the problem.

<div class="row justify-content-sm-center">
    <div class="col-sm-5 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/projects/academic/neural_optical_flow/nof_proc.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 6. NOF Methodology.
</div>

As seen in Fig. 6, the image space coordinates do not have to be the same as the physical space coordinates. In the case of optical flow for physical measurement of the kind we are doing, it makes more sense to sample images in image space and advect within physical space. The principle is the same, the abstraction is just simpler and it allows for easy multi-view PIV with separate image spaces and unified physical space.

Below you can see a comparison between CC, Wavelet Optical Flow (WOF), PIV-LiteFlow's OF, and NOF on a synthetic 2D HIT flow.

<div class="row justify-content-sm-center">
    <div class="col-sm-5 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/projects/academic/neural_optical_flow/2DHIT.webp" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 7. Reconstructed versus exact velocity magnitude fields for 2D HIT (top) and corresponding absolute error fields (bottom). NRMSEs are superimposed on the error plots.
</div>

As previously mentioned, the separation between physical space and image space allows for multiple viewpoints to be seamlessly integrated into a single velocity field. As seen below, various stereo setups can be used which will allow us to recover out of plane velocities.

<div class="row justify-content-sm-center">
    <div class="col-sm-5 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/projects/academic/neural_optical_flow/nof_stereo.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 8. Stereo imaging setups.
</div>

Instead of parameterizing the velocity field as just the 2D components within the image plane, one can parameterize it as a 3D vector field defined on the slice of the physical domain illuminated by the laser sheet. One then does the warping step for the images captured by both viewpoints, taking care to include the effects of the out of plane component in the warping, and allowing the particles to be advected off of the plane by some amount before be mapped back to the image space for the loss calculation. In this way the out of plane component can be reconstructed. This single velocity field method has many benefits over traditional stero methods, which mostly rely upon individual velocimetry calculations on both viewpoints, which are then stitched together to recover the out of plane component. This is obviously more computationally intensive, but it is also less accurate, as the individual fields are missing out on information which was contained in the other image pair. Below you can see the result of a stereo recovery of the out of plane component for a synthetic 3D HIT flow. More concrete details on the stero implementation can be found in our paper on this topic {% cite masker2025neural %}. 

<div class="row justify-content-sm-center">
    <div class="col-sm-5 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/projects/academic/neural_optical_flow/3DHIT.webp" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 8. Reconstructed versus exact velocity magnitude fields for 3D HIT (top) and corresponding absolute error fields (bottom) for a stereo setup. NRMSE values are superimposed
</div>

Aside from everything else mentioned, perhaps the biggest benefit that comes from using a neural implicit basis is the ability to include residuals on the navier stokes equations as a loss term. By including pressure as an output of the neural network, one can directly recover it from PIV images with no other step, which you can see below in a synthetic cylinder flow.

<div class="row justify-content-sm-center">
    <div class="col-sm-5 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/projects/academic/neural_optical_flow/pressure.webp" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 9. Reconstructed versus exact vorticity fields (top) and pressure fields (bottom) for the cylinder flow case. Corresponding point-wise error fields shown at right. NRMSE values are superimposed
</div>

Aside from the synthetic results, which have been shown above for the sake of getting errors, this method works well on experimental setups, which can be seen in our paper {% cite masker2025neural %}. 

### Implementation

This project was implemented in <a href="https://pytorch.org/">PyTorch</a>.
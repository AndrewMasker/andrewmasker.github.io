---
layout: page
title: Neural Optical Flow
description: a neural implicit optical flow methodology
img: assets/img/projects/academic/neural_optical_flow/nof.jpg
importance: 1
category: academic
related_publications: true
---

### Background

The measurement of fluid fields such as velocity, vorticity, and density is critical for the engineering process
when it comes to fluid based applications. Unfortunately, direct measurement with physical probes is limited to very sparse sampling
of the field due to the cost of probes and the fact that they disrupt the fluid, which leads to uncertainty about the veracity of the results.

As such, more indirect methods of measurement are required. One such method is Particle Image Velocimetry, wherein a fluid is seeded 
with particles small enough that they follow the movement of the fluid and by which snapshots of the flow can be imaged. Successive images of the particles moving in the fluid can then be used to reconstruct the velocity field as seen below in Fig. 1.

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

Aside from imaging techniques, the most difficult aspect of PIV is converting two consequtive images of particles being advected within a flow into the
underlying velocity field. This is of course a difficult prospect given the fact that particles are represented by patches of bright pixels with no association
between images rather than any sort of discrete point with a connection between images. While there are myriad methods to process PIV images into velocity fields, two main techniques exist at the forefront. 

### Cross Correlation

The first and older method is Cross Correlation, pictured below in Fig. 2. In this method, the first and second images of a succesive pair are each broken into interrogation windows. Matching pairs of interrogation windows across images are then cross correlated by computing the dot product of image one's window and a version of image two's window shifted by some offset. By computing this cross correlation at every offset of image two's window (within some bounds), one can make a mapping from discrete pixel offsets to the correlation between the windows. The offset with the maximum correlation is the one corresponding to how far image one's window was advected by the flow field. From that pixel offset, one can then work out a physical offset and with a time step can find the velocity. 

Cross Correlation is widely used given its mathematical simplicity, robustness, and ability to handle large particle displacements. The main draw back is that each window receives a single velocity vector, which can coarsen the resolution of the velocity field by a factor of 32 to 64 as compared to the undelying images and severely smooth the velocity field compared to reality. That drawback can be mitigated somewhat by repeating the process with increasingly smaller windows, using previous flow estimations as a prior to decrease the noise and inaccuracy that normally comes from smaller windows. It is also quite costly, requiring many FFT calculations in the standard approach.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/neural_optical_flow/Cross_Correlation_Animation.gif" title="Cross Correlation Example" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Fig 2. Cross Correlation Example Animation. Credit <a href="https://commons.wikimedia.org/wiki/File:Cross_Correlation_Animation.gif">Fzigunov</a>.
</div>

### Optical Flow

The other main method is Optical Flow, in which it is assumed that the total intensity (pixel brightness) is conserved when image one is advected by the flow field into image two. If we think of the discrete images as continuous fields in space and time, that statement of intensity conservation can be written formally as

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

A nonlinear inverse problem such as this has traditionally been very difficult to solve. As such, the first order taylor series approximation of the right side can be taken to get

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

or a smoothness term like the Horn-Schunck regulizer 

$$
0 = \int \left(|\nabla v_x|^2 + |\nabla v_y|^2 \right) \mathrm{d}A.
$$

One may use some combination of additional terms to gain a more well behaved result. Interestingly enough, unlike many problems that are ill-conditioned, it is actually quite easy to *see* the ill-conditioned nature of this problem with the Tikz Aperature visualiztion. Here you can see that being abe to observe the motion at just a point (or in this case through the aperature with a repeating pattern), is not enough to deduce the actual undelying motion. As seen below.

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
    Fig 5. Aperature Problem Visualization of Optical Flow Ill-Posedness. <a href="https://cdn.sinauer.com/wolfe4e/wa08.02.html">Credit</a>.
</div>

Optical flow addresses many of the issues with cross correlation, such as a higher, image quality resolution, and lower computational cost. Like all methods, it also has drawbacks. One such drawback is the that the maximum distance that a pixel can advect is very small, often limited to low single or even sub one pixel steps. This is primarily due to the linear approximation, which breaks down as particles move greater distances. It is often difficult to image a flow fast enough to ensure that a particle only moves such a short distance. the other big limitation of optical flow in the context of PIV is that particles are generally somewhat sparse, while optical flow works the best with continuous, fields where there is some amount of intensity everywhere. That concern is somewhat mitigated with the use of smoothing functions to "bridge the gaps" between particles, rather than having the field become very noisy.



The code is simple.
Just wrap your images with `<div class="col-sm">` and place them inside `<div class="row">` (read more about the <a href="https://getbootstrap.com/docs/4.4/layout/grid/">Bootstrap Grid</a> system).
To make images responsive, add `img-fluid` class to each; for rounded corners and shadows use `rounded` and `z-depth-1` classes.
Here's the code for the last row of images above:

{% raw %}

```html
<div class="row justify-content-sm-center">
  <div class="col-sm-8 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/6.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
  </div>
  <div class="col-sm-4 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/11.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
  </div>
</div>
```

{% endraw %}

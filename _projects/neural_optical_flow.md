---
layout: page
title: Neural Optical Flow
description: a neural implicit optical flow methodology
img: assets/img/projects/academic/neural_optical_flow/nof.jpg
importance: 1
category: academic
related_publications: true
---

The measurement of fluid fields such as velocity, vorticity, and density is critical for the engineering process
when it comes to fluid based applications. Unfortunately, direct measurement with physical probes is limited to very sparse sampling
of the field due to the cost of probes and the fact that they disrupt the fluid, which leads to uncertainty about the veracity of the results.

As such, more indirect methods of measurement are required. One such method is Particle Image Velocimetry, wherein a fluid is seeded 
with particles small enough that they follow the movement of the fluid. Succesive images of the particles moving in the
fluid can then be used to reconstruct the velocity field.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/neural_optical_flow/Impinging_PIV_Smaller.gif" title="PIV Example" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/projects/academic/neural_optical_flow/Impinging_PIV_Smaller_Result.jpg" title="PIV Example Processed" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    PIV Example. Right is processed from Left with <a href="https://pixlane.media/optical-flow/">pixlane</a>. Credit Left: Dr. Daniel Edgington-Mitchell.
</div>
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/5.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    This image can also have a caption. It's like magic.
</div>

You can also put regular text between your rows of images, even citations {% cite einstein1950meaning %}.
Say you wanted to write a bit about your project before you posted the rest of the images.
You describe how you toiled, sweated, _bled_ for your project, and then... you reveal its glory in the next row of images.

<div class="row justify-content-sm-center">
    <div class="col-sm-8 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/6.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm-4 mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/11.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    You can also have artistically styled 2/3 + 1/3 images, like these.
</div>

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

---
layout: page
permalink: /cv/
title: CV/Resume
nav: true
nav_order: 4
---

<div class="cv-tabs" role="tablist">
  <button type="button" class="cv-tab" role="tab" data-tab="cv" aria-controls="cv">CV</button>
  <button type="button" class="cv-tab" role="tab" data-tab="resume" aria-controls="resume">Resume</button>
</div>

<section class="cv-panel" id="cv" role="tabpanel">
  <a class="cv-download" href="https://raw.githubusercontent.com/AndrewMasker/CV_Resume_AIM/build/cv.pdf">Download PDF</a>
  <div class="pdf-inline" data-pdf="https://raw.githubusercontent.com/AndrewMasker/CV_Resume_AIM/build/cv.pdf"></div>
</section>

<section class="cv-panel" id="resume" role="tabpanel" hidden>
  <a class="cv-download" href="https://raw.githubusercontent.com/AndrewMasker/CV_Resume_AIM/build/resume.pdf">Download PDF</a>
  <div class="pdf-inline" data-pdf="https://raw.githubusercontent.com/AndrewMasker/CV_Resume_AIM/build/resume.pdf"></div>
</section>

<style>
  /* Tabs: CV and Resume. assets/js/pdf-inline.js switches them and sets aria-selected. */
  .cv-tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid var(--global-divider-color);
    margin-bottom: 1rem;
  }
  .cv-tab {
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    padding: 0.5rem 1rem;
    color: var(--global-text-color-light);
    cursor: pointer;
  }
  .cv-tab:hover {
    color: var(--global-hover-color);
  }
  .cv-tab[aria-selected="true"] {
    color: var(--global-theme-color);
    border-bottom-color: var(--global-theme-color);
  }
  .cv-download {
    display: inline-block;
    font-size: 0.875rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--global-theme-color);
    border-radius: 0.25rem;
    color: var(--global-theme-color);
  }
  .cv-download:hover {
    color: var(--global-hover-color);
    border-color: var(--global-hover-color);
    text-decoration: none;
  }

  /* Rendered PDF pages: white sheets with a shadow, in both light and dark mode */
  .pdf-inline {
    margin-top: 0.75rem;
    min-height: 4rem;
  }
  .pdf-page {
    position: relative;
    margin: 0 auto 1.5rem;
    background: #fff;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
    --scale-round-x: 1px;
    --scale-round-y: 1px;
  }
  .pdf-page canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* Text layer: transparent text over the canvas so it can be selected and searched.
     Trimmed from PDF.js's web/pdf_viewer.css (pdfjs-dist 6.5.438); keep the two in step
     if the version in pdf-inline.js changes. */
  .pdf-page .textLayer {
    position: absolute;
    text-align: initial;
    inset: 0;
    overflow: clip;
    opacity: 1;
    line-height: 1;
    letter-spacing: normal;
    word-spacing: normal;
    -webkit-text-size-adjust: none;
    text-size-adjust: none;
    forced-color-adjust: none;
    transform-origin: 0 0;
    caret-color: CanvasText;
    z-index: 0;
    --min-font-size: 1;
    --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
    --min-font-size-inv: calc(1 / var(--min-font-size));
  }
  .pdf-page .textLayer :is(span, br) {
    color: transparent;
    position: absolute;
    white-space: pre;
    cursor: text;
    transform-origin: 0% 0%;
    user-select: text;
  }
  .pdf-page .textLayer > :not(.markedContent),
  .pdf-page .textLayer .markedContent span:not(.markedContent) {
    z-index: 1;
    --font-height: 0;
    font-size: calc(var(--text-scale-factor) * var(--font-height));
    --scale-x: 1;
    --rotate: 0deg;
    transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
  }
  .pdf-page .textLayer .markedContent {
    display: contents;
  }
  .pdf-page .textLayer span[role="img"] {
    user-select: none;
    cursor: default;
  }
  .pdf-page .textLayer ::selection {
    background: rgba(0, 0, 255, 0.25);
    background: color-mix(in srgb, AccentColor, transparent 50%);
    color: transparent;
  }
  .pdf-page .textLayer br::selection {
    background: transparent;
  }
  .pdf-page .textLayer .endOfContent {
    display: block;
    position: absolute;
    inset: 100% 0 0;
    z-index: 0;
    cursor: default;
    user-select: none;
  }
  .pdf-page .textLayer.selecting .endOfContent {
    top: 0;
  }

  /* Link layer: invisible boxes over the PDF's links, above the text layer */
  .pdf-page .linkLayer {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
  }
  .pdf-page .linkLayer a {
    position: absolute;
    pointer-events: auto;
  }
  .pdf-page .linkLayer a:hover {
    background: rgba(0, 100, 255, 0.12);
  }
</style>

<script type="module" src="{{ '/assets/js/pdf-inline.js' | relative_url }}"></script>

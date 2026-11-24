---
layout: page
permalink: /publications/
title: Publications
description: Journal papers, conference papers and presentations, and theses.
nav: true
nav_order: 3
---

<style>
  /* divider above each section heading, except the first one */
  .publications h1 {
    border-top: 1px solid var(--global-divider-color);
    padding-top: 1rem;
  }
  .publications h1:first-of-type {
    border-top: none;
    padding-top: 0;
  }

  /* footnote for the equal-contribution asterisks */
  .publications .equal-contribution {
    font-size: 0.8rem;
    color: var(--global-text-color-light);
    margin-top: -0.5rem;
  }

  /* no extra line on the year heading directly under a section heading */
  .publications h1 + h2.bibliography {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }
</style>

<!-- _pages/publications.md -->

<!-- Bibsearch Feature -->

{% include bib_search.liquid %}

<div class="publications">

<h1>Journal Papers</h1>
{% bibliography --file papers --group_by none %}
<p class="equal-contribution"><sup>*</sup>Equal contribution.</p>

<h1>Conference Papers and Presentations</h1>
{% bibliography --file presentations --group_by none %}

<h1>Theses</h1>
{% bibliography --file theses --group_by none %}

</div>

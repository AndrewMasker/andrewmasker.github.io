// Draws PDFs straight into the page with PDF.js, so they read as part of the site instead
// of sitting inside the browser's PDF viewer.
//
// Usage: put <div class="pdf-inline" data-pdf="URL"></div> on a page and load this file as a
// module. Each PDF page becomes a canvas sized to the container's width, with two overlays:
//   - a text layer (transparent text positioned over the canvas) so the text can be selected,
//     copied, and found with Ctrl+F;
//   - a link layer (invisible <a> tags over the PDF's link boxes) so email, GitHub, and paper
//     links stay clickable.
// The page's CSS (see _pages/cv.md) styles .pdf-page, .textLayer, and .linkLayer.
//
// The CV page also uses this file for its tabs: buttons with class "cv-tab" and data-tab="ID"
// switch between sections with class "cv-panel" and id="ID". /cv/#resume opens the Resume tab.
//
// The PDFs are fetched from the CV_Resume_AIM repo's build branch on raw.githubusercontent.com,
// which allows cross-origin requests. A push there shows up here once GitHub's 5-minute cache
// expires; the site itself doesn't need to be rebuilt.

import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs";

const docs = new Map(); // url -> Promise<PDFDocumentProxy>, so tab switches and resizes don't refetch

async function render(el) {
  // A hidden tab has no width; it's drawn when it's shown. Skip if already drawn at this width.
  const width = el.clientWidth;
  if (!width || Number(el.dataset.width) === width) return;
  el.dataset.width = width;
  const run = (el._run = Symbol()); // a newer render (e.g. after a resize) supersedes this one

  const url = el.dataset.pdf;
  if (!docs.has(url)) docs.set(url, pdfjsLib.getDocument({ url }).promise);

  try {
    const pdf = await docs.get(url);
    const dpr = window.devicePixelRatio || 1;
    const pages = [];

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });

      const wrap = document.createElement("div");
      wrap.className = "pdf-page";
      wrap.style.width = `${viewport.width}px`;
      wrap.style.height = `${viewport.height}px`;
      wrap.style.setProperty("--total-scale-factor", viewport.scale); // read by the text layer

      // Canvas: drawn at device resolution so it stays sharp on high-DPI screens
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      wrap.append(canvas);
      await page.render({
        canvas,
        viewport,
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      }).promise;

      // Text layer: selectable, invisible text over the canvas
      const textDiv = document.createElement("div");
      textDiv.className = "textLayer";
      wrap.append(textDiv);
      await new pdfjsLib.TextLayer({
        textContentSource: page.streamTextContent(),
        container: textDiv,
        viewport,
      }).render();
      // PDF.js's own viewer adds this element so drag-selecting past the end of the text
      // doesn't jump to the top of the page; the "selecting" class stretches it while dragging.
      const end = document.createElement("div");
      end.className = "endOfContent";
      textDiv.append(end);
      textDiv.addEventListener("pointerdown", () => textDiv.classList.add("selecting"));

      // Link layer: clickable boxes over the PDF's links
      const linkDiv = document.createElement("div");
      linkDiv.className = "linkLayer";
      for (const a of await page.getAnnotations()) {
        if (a.subtype !== "Link" || !a.url) continue;
        const [x1, y1] = viewport.convertToViewportPoint(a.rect[0], a.rect[1]);
        const [x2, y2] = viewport.convertToViewportPoint(a.rect[2], a.rect[3]);
        const link = Object.assign(document.createElement("a"), {
          href: a.url,
          target: "_blank",
          rel: "noopener",
          title: a.url.replace(/^mailto:/, ""),
        });
        Object.assign(link.style, {
          left: `${Math.min(x1, x2)}px`,
          top: `${Math.min(y1, y2)}px`,
          width: `${Math.abs(x2 - x1)}px`,
          height: `${Math.abs(y2 - y1)}px`,
        });
        linkDiv.append(link);
      }
      wrap.append(linkDiv);

      if (el._run !== run) return; // superseded mid-render
      pages.push(wrap);
    }
    el.replaceChildren(...pages);
  } catch (err) {
    console.error(`Couldn't render ${url}:`, err);
    if (el._run !== run) return;
    docs.delete(url); // let a later attempt refetch
    delete el.dataset.width;
    const msg = document.createElement("p");
    msg.className = "pdf-error";
    msg.append("The PDF couldn't be shown here. ");
    msg.append(Object.assign(document.createElement("a"), { href: url, textContent: "Download it instead." }));
    el.replaceChildren(msg);
  }
}

document.addEventListener("pointerup", () =>
  document.querySelectorAll(".textLayer.selecting").forEach((t) => t.classList.remove("selecting"))
);

// Tabs
const tabs = [...document.querySelectorAll(".cv-tab")];
const panels = [...document.querySelectorAll(".cv-panel")];

function show(id) {
  tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === id)));
  panels.forEach((p) => (p.hidden = p.id !== id));
  document.querySelectorAll(`#${id} .pdf-inline`).forEach(render);
}

tabs.forEach((t) =>
  t.addEventListener("click", () => {
    history.replaceState(null, "", `#${t.dataset.tab}`);
    show(t.dataset.tab);
  })
);

const initial = location.hash.slice(1);
show(panels.some((p) => p.id === initial) ? initial : panels[0]?.id);

// Redraw the visible PDF when the content column changes width
let timer;
addEventListener("resize", () => {
  clearTimeout(timer);
  timer = setTimeout(() => document.querySelectorAll(".cv-panel:not([hidden]) .pdf-inline").forEach(render), 200);
});

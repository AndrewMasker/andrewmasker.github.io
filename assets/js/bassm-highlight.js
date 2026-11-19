// Syntax highlighting for Bassm code blocks, using the TextMate grammar from the
// Bashputer repo's VS Code extension. Shiki runs the same grammar engine as VS Code.
//
// Usage: fence code blocks as ```bassm, then load this file as a module on the page.
// Rouge doesn't know Bassm, so kramdown renders those blocks unhighlighted as
// <pre><code class="language-bassm">, and this script colors them in the browser.
// If Shiki or the grammar can't be loaded, the blocks stay as plain text.

import { createHighlighter, createJavaScriptRegexEngine } from "https://esm.sh/shiki@4.6.0";

// Served by jsDelivr from the Bashputer repo, so the site picks up grammar changes.
// jsDelivr caches branch files, so a change can take a while to appear.
const GRAMMAR_URL = "https://cdn.jsdelivr.net/gh/AndrewMasker/Bashputer@master/Assembler/Assembly%20Extension/syntaxes/bassm.tmLanguage.json";

const THEMES = { light: "light-plus", dark: "dark-plus" };

// The site's jekyll-terser plugin minifies every .js file in script mode, which can't
// parse top-level `await`. When minifying fails, the plugin skips writing the file, so the
// page 404s on it. Keep all awaits inside this function.
async function highlightBassm() {
  // kramdown's plain-text fallback puts the class on <code>; a highlighted block would
  // put it on a wrapping <div>, so match both
  const blocks = document.querySelectorAll("code.language-bassm, .language-bassm pre code");
  if (!blocks.length) return;

  const response = await fetch(GRAMMAR_URL);
  if (!response.ok) throw new Error(`grammar request failed: ${response.status}`);
  const grammar = await response.json();

  const highlighter = await createHighlighter({
    // The grammar's own name is "Bashputer Assembly", so give it a short id here
    langs: [{ ...grammar, name: "bassm" }],
    themes: Object.values(THEMES),
    // Shiki's default regex engine (Oniguruma) is WebAssembly, which the site's
    // Content-Security-Policy blocks: compiling WebAssembly needs 'wasm-unsafe-eval' in
    // script-src. The JavaScript engine needs no WebAssembly and gives identical output
    // for the Bassm grammar.
    engine: createJavaScriptRegexEngine(),
  });

  for (const code of blocks) {
    const html = highlighter.codeToHtml(code.textContent, {
      lang: "bassm",
      themes: THEMES,
      defaultColor: false, // emit both colors as --shiki-light / --shiki-dark
    });
    // Keep the site's own <pre> (background, copy button) and swap in only the colored text
    const template = document.createElement("template");
    template.innerHTML = html;
    code.innerHTML = template.content.querySelector("code").innerHTML;
  }
}

// On failure the blocks stay as plain text. The site's Terser config (drop_console) strips
// console calls from the deployed file, so report the error with reportError instead: it
// shows up in the browser console as an uncaught error.
highlightBassm().catch((error) => reportError(error));

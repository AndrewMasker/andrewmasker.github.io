// Syntax highlighting for Bassm code blocks, using the TextMate grammar from the
// Bashputer repo's VS Code extension. Shiki runs the same grammar engine as VS Code.
//
// Usage: fence code blocks as ```bassm, then load this file as a module on the page.
// Rouge doesn't know Bassm, so kramdown renders those blocks unhighlighted as
// <pre><code class="language-bassm">, and this script colors them in the browser.
// If Shiki, the grammar, or the theme can't be loaded, the blocks stay as plain text.

import { createHighlighter, createJavaScriptRegexEngine } from "https://esm.sh/shiki@4.6.0";

// Served by jsDelivr from the Bashputer repo, so the site picks up grammar changes.
// jsDelivr caches branch files, so a change can take a while to appear.
const GRAMMAR_URL = "https://cdn.jsdelivr.net/gh/AndrewMasker/Bashputer@master/Assembler/Assembly%20Extension/syntaxes/bassm.tmLanguage.json";

// VS Code's "Dark 2026" default theme. Shiki doesn't bundle it, so it's flattened into one
// file from VS Code's theme-defaults extension (see the _source field in the file). The
// site's baseurl is empty, so a root-relative path works. Blocks use this dark theme in
// both of the site's light and dark modes; the page's <style> gives them the matching
// editor background (#121314) and foreground (#BBBEBF).
const THEME_URL = "/assets/json/vscode-dark-2026.json";
const THEME = "dark-2026";

async function fetchJson(url, what) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${what} request failed: ${response.status}`);
  return response.json();
}

// The site's jekyll-terser plugin minifies every .js file in script mode, which can't
// parse top-level `await`. When minifying fails, the plugin skips writing the file, so the
// page 404s on it. Keep all awaits inside this function.
async function highlightBassm() {
  // kramdown's plain-text fallback puts the class on <code>; a highlighted block would
  // put it on a wrapping <div>, so match both
  const blocks = document.querySelectorAll("code.language-bassm, .language-bassm pre code");
  if (!blocks.length) return;

  const [grammar, theme] = await Promise.all([fetchJson(GRAMMAR_URL, "grammar"), fetchJson(THEME_URL, "theme")]);

  const highlighter = await createHighlighter({
    // The grammar's own name is "Bashputer Assembly", so give it a short id here
    langs: [{ ...grammar, name: "bassm" }],
    themes: [theme],
    // Shiki's default regex engine (Oniguruma) is WebAssembly, which the site's
    // Content-Security-Policy blocks: compiling WebAssembly needs 'wasm-unsafe-eval' in
    // script-src. The JavaScript engine needs no WebAssembly and gives identical output
    // for the Bassm grammar.
    engine: createJavaScriptRegexEngine(),
  });

  for (const code of blocks) {
    const html = highlighter.codeToHtml(code.textContent, {
      lang: "bassm",
      theme: THEME,
    });
    // Keep the site's own <pre> (copy button, layout) and swap in only the colored text
    const template = document.createElement("template");
    template.innerHTML = html;
    code.innerHTML = template.content.querySelector("code").innerHTML;
  }
}

// On failure the blocks stay as plain text. The site's Terser config (drop_console) strips
// console calls from the deployed file, so report the error with reportError instead: it
// shows up in the browser console as an uncaught error.
highlightBassm().catch((error) => reportError(error));

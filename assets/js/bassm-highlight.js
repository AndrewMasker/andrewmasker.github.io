// Syntax highlighting for Bassm code blocks, using the TextMate grammar from the
// Bashputer repo's VS Code extension. Shiki runs the same grammar engine as VS Code.
//
// Usage: fence code blocks as ```bassm, or tag inline code as `code`{:.language-bassm},
// then load this file as a module on the page. Rouge doesn't know Bassm, so kramdown
// renders both unhighlighted as <code class="language-bassm"> (inside a <pre> for blocks),
// and this script colors them in the browser.
// If Shiki, the grammar, or the theme can't be loaded, the blocks stay as plain text.

import { createHighlighter, createJavaScriptRegexEngine } from "https://esm.sh/shiki@4.6.0";

// Served by jsDelivr from the Bashputer repo, so the site picks up grammar changes.
// jsDelivr caches branch files, so a change can take a while to appear.
const GRAMMAR_URL = "https://cdn.jsdelivr.net/gh/AndrewMasker/Bashputer@master/Assembler/Assembly%20Extension/syntaxes/bassm.tmLanguage.json";

// VS Code's "Light 2026" and "Dark 2026" default themes. Shiki doesn't bundle them, so each
// is flattened into one file from VS Code's theme-defaults extension (see the _source field
// in each file). The site's baseurl is empty, so root-relative paths work.
const THEME_URLS = ["/assets/json/vscode-light-2026.json", "/assets/json/vscode-dark-2026.json"];
// Both colors are emitted as --shiki-light / --shiki-dark CSS variables, and the page's
// <style> picks one based on the site's light/dark mode (html[data-theme="dark"]).
const THEMES = { light: "light-2026", dark: "dark-2026" };

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

  const [grammar, ...themes] = await Promise.all([fetchJson(GRAMMAR_URL, "grammar"), ...THEME_URLS.map((url) => fetchJson(url, "theme"))]);

  const highlighter = await createHighlighter({
    // The grammar's own name is "Bashputer Assembly", so give it a short id here
    langs: [{ ...grammar, name: "bassm" }],
    themes,
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
      defaultColor: false, // emit only the CSS variables; the page's <style> chooses one
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

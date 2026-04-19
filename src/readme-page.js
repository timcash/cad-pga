import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import Prism from "prismjs";
import "./docs.css";
import { loadPrismComponents, renderMarkdownFile } from "./readme-renderer.js";

const root = document.documentElement;
const prism = Prism;
const shell = document.querySelector("#readme-root");

root.classList.add("docs-enhanced");
window.Prism = prism;
globalThis.Prism = prism;

await loadPrismComponents();

registerServiceWorker();

if (!shell) {
  throw new Error("Expected #readme-root for the README page.");
}

const readmeSource = shell.getAttribute("data-readme-source") || "./README.md";

try {
  await renderMarkdownFile(shell, readmeSource, {
    baseUrl: new URL(readmeSource, window.location.href).toString()
  });
} catch (error) {
  shell.innerHTML = `
    <article class="markdown-body">
      <h1>README Unavailable</h1>
      <p>Unable to load <code>${escapeHtml(readmeSource)}</code>.</p>
    </article>
  `;
  console.error("README render failed:", error);
}

highlightCode(shell);
root.classList.add("math-loading");
configureMathJax();

try {
  await import("mathjax/tex-chtml.js");
  await window.MathJax?.startup?.promise;
  if (window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([shell]);
  }
  root.classList.remove("math-loading");
  root.classList.add("math-ready");
  highlightCode(shell);
} catch (error) {
  root.classList.remove("math-loading");
  root.classList.add("math-error");
  console.error("MathJax failed to load:", error);
}

function registerServiceWorker() {
  const scriptPath = root.dataset.swScript;
  const scopePath = root.dataset.swScope;

  if (!("serviceWorker" in navigator) || !scriptPath || !scopePath) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(scriptPath, { scope: scopePath }).catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

function configureMathJax() {
  window.MathJax = {
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]],
      packages: { "[+]": ["ams", "noerrors", "noundefined"] }
    },
    options: {
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"]
    },
    chtml: {
      displayAlign: "left",
      scale: 1.02,
      mtextInheritFont: true
    },
    startup: {
      ready() {
        window.MathJax.startup.defaultReady();
      }
    }
  };
}

function highlightCode(target) {
  Prism.highlightAllUnder(target);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

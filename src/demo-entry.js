import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import Prism from "prismjs";
import "./demo-panels.css";
import { loadPrismComponents, renderMarkdownFile } from "./readme-renderer.js";

const root = document.documentElement;
const prism = Prism;
const readmeBody = document.querySelector("[data-demo-readme-body]");
const readmeStatus = document.querySelector("[data-demo-readme-status]");

window.Prism = prism;
globalThis.Prism = prism;

await loadPrismComponents();

if (readmeBody && readmeStatus) {
  try {
    await renderMarkdownFile(readmeBody, new URL("README.md", window.location.href).toString(), {
      baseUrl: new URL("README.md", window.location.href).toString()
    });
    readmeStatus.textContent = "README loaded from the example folder.";
    highlightCode(readmeBody);
  } catch (error) {
    readmeStatus.textContent = "README unavailable for this example.";
    readmeBody.innerHTML = "";
    console.error("Demo README failed to load:", error);
  }
}

root.classList.add("demo-math-loading");
configureMathJax();

try {
  await import("mathjax/tex-chtml.js");
  await window.MathJax?.startup?.promise;
  if (readmeBody && window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([readmeBody]);
    highlightCode(readmeBody);
  }
} catch (error) {
  root.classList.remove("demo-math-loading");
  root.classList.add("demo-math-error");
  console.error("Demo MathJax failed to load:", error);
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
      scale: 0.98,
      mtextInheritFont: true
    },
    startup: {
      ready() {
        window.MathJax.startup.defaultReady();
      },
      pageReady() {
        return window.MathJax.startup.defaultPageReady().then(() => {
          root.classList.remove("demo-math-loading");
          root.classList.add("demo-math-ready");
        });
      }
    }
  };
}

function highlightCode(target) {
  Prism.highlightAllUnder(target);
}

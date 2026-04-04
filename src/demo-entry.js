import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "./demo-panels.css";

const root = document.documentElement;

root.classList.add("demo-math-loading");
configureMathJax();

try {
  await import("mathjax/tex-chtml.js");
  await window.MathJax?.startup?.promise;
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

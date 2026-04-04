import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import Prism from 'prismjs';
import './docs.css';

const root = document.documentElement;
const prism = Prism;

root.classList.add('docs-enhanced');

window.Prism = prism;
globalThis.Prism = prism;

await loadPrismComponents();

root.classList.add('math-loading');

registerServiceWorker();
configureMathJax();
highlightCode();

try {
  await import('mathjax/tex-chtml.js');
  await window.MathJax?.startup?.promise;
  root.classList.remove('math-loading');
  root.classList.add('math-ready');
  highlightCode();
} catch (error) {
  root.classList.remove('math-loading');
  root.classList.add('math-error');
  console.error('MathJax failed to load:', error);
}

async function loadPrismComponents() {
  try {
    await Promise.all([
      import('prismjs/components/prism-bash'),
      import('prismjs/components/prism-javascript'),
      import('prismjs/components/prism-markup')
    ]);
  } catch (error) {
    console.error('Prism components failed to load:', error);
  }
}

function registerServiceWorker() {
  const scriptPath = root.dataset.swScript;
  const scopePath = root.dataset.swScope;

  if (!('serviceWorker' in navigator) || !scriptPath || !scopePath) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(scriptPath, { scope: scopePath }).catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

function configureMathJax() {
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      packages: { '[+]': ['ams', 'noerrors', 'noundefined'] }
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
    },
    chtml: {
      displayAlign: 'left',
      scale: 1.02,
      mtextInheritFont: true
    },
    startup: {
      ready() {
        window.MathJax.startup.defaultReady();
      },
      pageReady() {
        return window.MathJax.startup.defaultPageReady().then(() => {
          root.classList.remove('math-loading');
          root.classList.add('math-ready');
          highlightCode();
        });
      }
    }
  };
}

function highlightCode() {
  Prism.highlightAll();
}

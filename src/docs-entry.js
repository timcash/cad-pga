import './docs.css';

const root = document.documentElement;

root.classList.add('math-loading');

registerServiceWorker();
configureMathJax();

try {
  await import('mathjax/tex-chtml.js');
} catch (error) {
  root.classList.remove('math-loading');
  root.classList.add('math-error');
  console.error('MathJax failed to load:', error);
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
        window.MathJax.startup.promise.then(() => {
          root.classList.remove('math-loading');
          root.classList.add('math-ready');
        });
      }
    }
  };
}

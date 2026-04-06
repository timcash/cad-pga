import { CodexTerminalPage } from './codex/CodexTerminalPage';
import './codex/codexTerminal.css';

registerServiceWorker();

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Expected #app root element for the Codex route.');
}

const codexTerminalPage = new CodexTerminalPage(root);
void codexTerminalPage.render();

function registerServiceWorker() {
  const htmlRoot = document.documentElement;
  const scriptPath = htmlRoot.dataset.swScript;
  const scopePath = htmlRoot.dataset.swScope;

  if (!('serviceWorker' in navigator) || !scriptPath || !scopePath) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(scriptPath, { scope: scopePath }).catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

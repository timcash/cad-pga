type LegionMode = 'auto' | 'dev' | 'legion';
type LegionSocketPhase = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

interface PublicConfigResponse {
  ok: boolean;
  publicOrigin: string;
  socketPath: string;
  allowedOrigins: string[];
  sessionLabel: string;
}

const MODE_STORAGE_KEY = 'cad-pga.legion.mode';
const REMOTE_ORIGIN = 'https://legion.dialtone.earth';
const SOCKET_PATH = '/ws-lab';
const CONFIG_PATH = '/api/ws-lab/public-config';
const CONFIG_TIMEOUT_MS = 4000;

export class LegionWsPage {
  private readonly root: HTMLDivElement;
  private mode: LegionMode = 'auto';
  private socket: WebSocket | null = null;
  private statusValue: HTMLParagraphElement | null = null;
  private modeValue: HTMLParagraphElement | null = null;
  private originValue: HTMLParagraphElement | null = null;
  private healthValue: HTMLParagraphElement | null = null;
  private logHost: HTMLDivElement | null = null;
  private messageInput: HTMLInputElement | null = null;
  private authorizeButton: HTMLButtonElement | null = null;
  private connectButton: HTMLButtonElement | null = null;
  private disconnectButton: HTMLButtonElement | null = null;
  private pingButton: HTMLButtonElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private modeButtons: HTMLButtonElement[] = [];

  constructor(root: HTMLDivElement) {
    this.root = root;
    this.mode = this.resolveInitialMode();
  }

  public async render() {
    document.title = 'Legion WebSocket Tunnel - CAD PGA';
    this.root.innerHTML = `
      <main class="legion-shell">
        <header class="legion-hero">
          <a class="legion-back-link" href="../">CAD PGA</a>
          <p class="legion-eyebrow">Legion WebSocket Tunnel</p>
          <h1 class="legion-title">A static GitHub Pages route talking to a live local WebSocket server.</h1>
          <p class="legion-lede">
            This page stays static on GitHub Pages. The live part is the WebSocket endpoint, which can run on localhost
            in dev mode or through <code>legion.dialtone.earth</code> when the Cloudflare tunnel is active.
          </p>
          <p class="legion-note">
            Remote mode is protected by Cloudflare Access. Press <strong>Authorize</strong>, finish the email PIN login
            on <code>legion.dialtone.earth</code>, then return here and press <strong>Connect</strong>.
          </p>
        </header>

        <section class="legion-grid">
          <article class="legion-card legion-card--wide">
            <span class="legion-label">Mode</span>
            <p class="legion-value" data-legion-mode-summary></p>
            <div class="legion-mode-toggle" role="group" aria-label="Legion WebSocket mode">
              <button type="button" class="legion-mode-btn" data-legion-mode-button="auto">Auto</button>
              <button type="button" class="legion-mode-btn" data-legion-mode-button="dev">Dev</button>
              <button type="button" class="legion-mode-btn" data-legion-mode-button="legion">Legion</button>
            </div>
          </article>

          <article class="legion-card">
            <span class="legion-label">Socket State</span>
            <p class="legion-value" data-legion-status>Idle.</p>
          </article>

          <article class="legion-card legion-card--wide">
            <span class="legion-label">Target Origin</span>
            <p class="legion-value" data-legion-origin>Resolving…</p>
          </article>

          <article class="legion-card legion-card--wide">
            <span class="legion-label">Health</span>
            <p class="legion-value" data-legion-health>Checking config route…</p>
          </article>
        </section>

        <section class="legion-toolbar">
          <button type="button" class="legion-action legion-action--primary" data-legion-authorize>Authorize</button>
          <button type="button" class="legion-action" data-legion-connect>Connect</button>
          <button type="button" class="legion-action" data-legion-disconnect>Disconnect</button>
          <button type="button" class="legion-action" data-legion-ping>Ping</button>
        </section>

        <section class="legion-console">
          <div class="legion-log" data-legion-log></div>
          <form class="legion-input-row" data-legion-send-form>
            <input class="legion-input" data-legion-message type="text" placeholder='Send JSON or text. Example: {"type":"hello","from":"browser"}'>
            <button type="submit" class="legion-action legion-action--primary" data-legion-send>Send</button>
          </form>
        </section>
      </main>
    `;

    this.statusValue = this.root.querySelector('[data-legion-status]');
    this.modeValue = this.root.querySelector('[data-legion-mode-summary]');
    this.originValue = this.root.querySelector('[data-legion-origin]');
    this.healthValue = this.root.querySelector('[data-legion-health]');
    this.logHost = this.root.querySelector('[data-legion-log]');
    this.messageInput = this.root.querySelector('[data-legion-message]');
    this.authorizeButton = this.root.querySelector('[data-legion-authorize]');
    this.connectButton = this.root.querySelector('[data-legion-connect]');
    this.disconnectButton = this.root.querySelector('[data-legion-disconnect]');
    this.pingButton = this.root.querySelector('[data-legion-ping]');
    this.sendButton = this.root.querySelector('[data-legion-send]');
    this.modeButtons = Array.from(this.root.querySelectorAll('[data-legion-mode-button]'));

    this.modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextMode = button.dataset.legionModeButton;
        if (nextMode === 'auto' || nextMode === 'dev' || nextMode === 'legion') {
          void this.setMode(nextMode);
        }
      });
    });

    this.connectButton?.addEventListener('click', () => {
      void this.connect();
    });

    this.authorizeButton?.addEventListener('click', () => {
      this.openAccessLogin();
    });

    this.disconnectButton?.addEventListener('click', () => {
      this.disconnect('Client closed the socket.');
    });

    this.pingButton?.addEventListener('click', () => {
      this.sendPayload(
        JSON.stringify({
          type: 'ping',
          sentAt: new Date().toISOString(),
          source: 'legion-page'
        })
      );
    });

    this.root.querySelector('[data-legion-send-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const payload = this.messageInput?.value.trim() ?? '';
      if (!payload) {
        return;
      }

      this.sendPayload(payload);
      if (this.messageInput) {
        this.messageInput.value = '';
      }
    });

    this.syncModeUi();
    await this.refreshConfig();
    this.setSocketPhase('idle', 'Ready. Choose a mode and connect.');
    this.appendLog('system', 'Page loaded. Waiting for a WebSocket connection.');
  }

  private async setMode(mode: LegionMode) {
    if (mode === this.mode) {
      return;
    }

    this.disconnect(`Mode switched to ${modeLabelMap[mode]}.`);
    this.mode = mode;
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    this.syncModeUi();
    await this.refreshConfig();
    this.setSocketPhase('idle', `Switched to ${modeLabelMap[mode]}.`);
  }

  private async refreshConfig() {
    const origin = this.resolveHttpOrigin();
    this.setOriginText(origin);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
    this.setHealthText('Checking config route…');

    try {
      const response = await fetch(this.resolveHttpUrl(CONFIG_PATH), {
        headers: {
          Accept: 'application/json'
        },
        mode: 'cors',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Config request failed with status ${response.status}.`);
      }

      const config = (await response.json()) as PublicConfigResponse;
      this.setHealthText(
        `Reachable. ${config.sessionLabel} Allowed origins: ${config.allowedOrigins.join(', ')}.`
      );
    } catch (error) {
      if (this.requiresRemoteAccessLogin(origin)) {
        this.setHealthText(
          'Cloudflare Access login is probably required. Press Authorize, finish the email PIN flow on legion.dialtone.earth, then return here and press Connect.'
        );
        this.appendLog(
          'system',
          'Remote Access auth is likely required before the config route can be reached from GitHub Pages.'
        );
        return;
      }

      this.setHealthText(readErrorMessage(error, 'The target origin is not reachable yet.'));
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private async connect() {
    this.disconnect();
    const socketUrl = this.resolveSocketUrl();
    this.setSocketPhase('connecting', `Opening ${socketUrl} …`);
    this.appendLog('system', `Connecting to ${socketUrl}`);

    const socket = new WebSocket(socketUrl);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.setSocketPhase('connected', `Connected to ${socketUrl}.`);
      this.appendLog('system', `Connected to ${socketUrl}`);
      this.sendPayload(
        JSON.stringify({
          type: 'hello',
          sentAt: new Date().toISOString(),
          from: 'legion-page',
          mode: this.mode
        })
      );
    });

    socket.addEventListener('message', (event) => {
      const text = typeof event.data === 'string' ? event.data : '[binary message]';
      this.appendLog('remote', prettyFormat(text));
    });

    socket.addEventListener('close', (event) => {
      if (this.socket === socket) {
        this.socket = null;
      }

      this.setSocketPhase('closed', event.reason || 'Socket closed.');
      this.appendLog('system', `Socket closed${event.reason ? `: ${event.reason}` : '.'}`);
    });

    socket.addEventListener('error', () => {
      this.setSocketPhase('error', `Unable to reach ${socketUrl}.`);
      this.appendLog('system', `Socket error while connecting to ${socketUrl}`);
      if (this.requiresRemoteAccessLogin()) {
        this.appendLog(
          'system',
          'If you are on GitHub Pages, press Authorize first so Cloudflare Access can issue a session cookie for legion.dialtone.earth.'
        );
      }
    });
  }

  private disconnect(reason?: string) {
    if (this.socket) {
      this.socket.close(1000, reason ?? 'Client disconnected');
      this.socket = null;
    }
  }

  private sendPayload(payload: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.appendLog('system', 'Socket is not open yet.');
      return;
    }

    this.socket.send(payload);
    this.appendLog('local', prettyFormat(payload));
  }

  private syncModeUi() {
    if (this.modeValue) {
      this.modeValue.textContent = modeCopyMap[this.mode];
    }

    if (this.authorizeButton) {
      this.authorizeButton.hidden = !this.requiresRemoteAccessLogin();
    }

    this.modeButtons.forEach((button) => {
      const isActive = button.dataset.legionModeButton === this.mode;
      button.classList.toggle('legion-mode-btn--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  private setSocketPhase(phase: LegionSocketPhase, detail: string) {
    if (this.statusValue) {
      this.statusValue.textContent = `${phaseLabelMap[phase]} ${detail}`;
    }

    if (this.connectButton) {
      this.connectButton.disabled = phase === 'connecting' || phase === 'connected';
    }

    if (this.disconnectButton) {
      this.disconnectButton.disabled = phase !== 'connecting' && phase !== 'connected';
    }

    const canSend = phase === 'connected';
    if (this.pingButton) {
      this.pingButton.disabled = !canSend;
    }
    if (this.sendButton) {
      this.sendButton.disabled = !canSend;
    }
    if (this.messageInput) {
      this.messageInput.disabled = !canSend;
    }
  }

  private setOriginText(origin: string) {
    if (this.originValue) {
      this.originValue.textContent = `${origin}${SOCKET_PATH}`;
    }
  }

  private setHealthText(summary: string) {
    if (this.healthValue) {
      this.healthValue.textContent = summary;
    }
  }

  private openAccessLogin() {
    const accessUrl = this.resolveHttpUrl(CONFIG_PATH);
    window.open(accessUrl, '_blank', 'noopener,noreferrer');
    this.appendLog(
      'system',
      `Opened ${accessUrl}. Finish Cloudflare Access there, then return here and press Connect.`
    );
  }

  private appendLog(kind: 'system' | 'local' | 'remote', text: string) {
    if (!this.logHost) {
      return;
    }

    const entry = document.createElement('div');
    entry.className = `legion-log-entry legion-log-entry--${kind}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    this.logHost.append(entry);
    this.logHost.scrollTop = this.logHost.scrollHeight;
  }

  private resolveInitialMode(): LegionMode {
    const requestedMode = new URLSearchParams(window.location.search).get('mode');
    if (requestedMode === 'auto' || requestedMode === 'dev' || requestedMode === 'legion') {
      return requestedMode;
    }

    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === 'auto' || stored === 'dev' || stored === 'legion') {
      return stored;
    }

    return 'auto';
  }

  private resolveHttpOrigin() {
    const configuredOrigin = import.meta.env.VITE_LEGION_WS_ORIGIN || REMOTE_ORIGIN;

    switch (this.mode) {
      case 'dev':
        return window.location.origin;
      case 'legion':
        return configuredOrigin;
      case 'auto':
      default:
        return window.location.hostname.endsWith('github.io') ? configuredOrigin : window.location.origin;
    }
  }

  private resolveHttpUrl(pathname: string) {
    const url = new URL(this.resolveHttpOrigin());
    url.pathname = pathname;
    url.search = '';
    return url.toString();
  }

  private resolveSocketUrl() {
    const url = new URL(this.resolveHttpOrigin());
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = SOCKET_PATH;
    url.search = '';
    return url.toString();
  }

  private requiresRemoteAccessLogin(origin = this.resolveHttpOrigin()) {
    return origin !== window.location.origin;
  }
}

const modeCopyMap: Record<LegionMode, string> = {
  auto: 'Auto mode uses the localhost dev proxy on local pages and switches to legion.dialtone.earth on GitHub Pages.',
  dev: 'Dev mode stays on the current page origin and relies on the local Vite WebSocket proxy.',
  legion: 'Legion mode always targets the public tunnel origin at legion.dialtone.earth.'
};

const modeLabelMap: Record<LegionMode, string> = {
  auto: 'auto mode',
  dev: 'dev mode',
  legion: 'legion mode'
};

const phaseLabelMap: Record<LegionSocketPhase, string> = {
  idle: 'Idle.',
  connecting: 'Connecting.',
  connected: 'Connected.',
  closed: 'Closed.',
  error: 'Error.'
};

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function prettyFormat(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

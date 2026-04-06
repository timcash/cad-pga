import type {
  CodexAuthLoginResponse,
  CodexBridgeClientMessage,
  CodexBridgeHealth,
  CodexBridgeMode,
  CodexBridgePublicConfig,
  CodexBridgeServerMessage,
  TerminalSize
} from '../../shared/codex/CodexBridgeTypes';

export type CodexTerminalClientLifecycle = 'connecting' | 'connected' | 'disconnected' | 'error';

interface CodexTerminalClientOptions {
  sessionId: string;
  onMessage: (message: CodexBridgeServerMessage) => void;
  onLifecycleChange: (phase: CodexTerminalClientLifecycle, detail: string) => void;
  onAuthExpired: (detail: string) => void;
}

const DEFAULT_REMOTE_ORIGIN = 'https://codex.dialtone.earth';
const PUBLIC_CONFIG_PATH = '/api/codex/public-config';
const LOGIN_PATH = '/api/codex/auth/login';
const LOGOUT_PATH = '/api/codex/auth/logout';
const HEALTH_PATH = '/api/codex/health';
const TERMINAL_SOCKET_PATH = '/codex-bridge';
const DEFAULT_LOCAL_BRIDGE_ORIGIN = 'http://127.0.0.1:4186';

export class CodexTerminalClient {
  private socket: WebSocket | null = null;
  private readonly sessionId: string;
  private readonly onMessage: (message: CodexBridgeServerMessage) => void;
  private readonly onLifecycleChange: (phase: CodexTerminalClientLifecycle, detail: string) => void;
  private readonly onAuthExpired: (detail: string) => void;
  private bridgeMode: CodexBridgeMode = 'auto';

  constructor(options: CodexTerminalClientOptions) {
    this.sessionId = options.sessionId;
    this.onMessage = options.onMessage;
    this.onLifecycleChange = options.onLifecycleChange;
    this.onAuthExpired = options.onAuthExpired;
  }

  public getBridgeOrigin() {
    return this.getBaseUrl().origin;
  }

  public getBridgeMode() {
    return this.bridgeMode;
  }

  public setBridgeMode(mode: CodexBridgeMode) {
    this.bridgeMode = mode;
  }

  public async fetchPublicConfig() {
    return this.fetchJson<CodexBridgePublicConfig>(PUBLIC_CONFIG_PATH, {
      method: 'GET'
    });
  }

  public async login(password: string) {
    return this.fetchJson<CodexAuthLoginResponse>(LOGIN_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });
  }

  public async logout(authToken: string) {
    await this.fetchJson<{ ok: true }>(
      LOGOUT_PATH,
      {
        method: 'POST'
      },
      authToken
    );
  }

  public async fetchHealth(authToken: string) {
    return this.fetchJson<CodexBridgeHealth>(
      HEALTH_PATH,
      {
        method: 'GET'
      },
      authToken
    );
  }

  public connect(authToken: string) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.onLifecycleChange('connecting', 'Connecting to the Codex bridge...');

    const socket = new WebSocket(this.buildWebSocketUrl(authToken));
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.onLifecycleChange('connected', 'Bridge connected. Starting Codex...');
    });

    socket.addEventListener('message', (event) => {
      const parsedMessage = this.parseMessage(event.data);
      if (!parsedMessage) {
        return;
      }
      this.onMessage(parsedMessage);
    });

    socket.addEventListener('close', (event) => {
      if (this.socket === socket) {
        this.socket = null;
      }

      if (event.code === 4401 || event.code === 4403) {
        this.onAuthExpired(event.reason || 'Your unlock session expired.');
        return;
      }

      this.onLifecycleChange('disconnected', event.reason || 'The Codex bridge connection closed.');
    });

    socket.addEventListener('error', () => {
      this.onLifecycleChange('error', 'Unable to reach the Codex bridge.');
    });
  }

  public disconnect() {
    this.socket?.close(1000, 'Client disconnected');
    this.socket = null;
  }

  public sendInput(data: string) {
    this.send({
      type: 'input',
      data
    });
  }

  public resize(size: TerminalSize) {
    this.send({
      type: 'resize',
      cols: size.cols,
      rows: size.rows
    });
  }

  public restart(size: TerminalSize) {
    this.send({
      type: 'restart',
      cols: size.cols,
      rows: size.rows
    });
  }

  public interrupt() {
    this.send({
      type: 'interrupt'
    });
  }

  private send(message: CodexBridgeClientMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  private parseMessage(payload: string | ArrayBuffer | Blob) {
    if (typeof payload !== 'string') {
      return null;
    }

    try {
      return JSON.parse(payload) as CodexBridgeServerMessage;
    } catch {
      this.onLifecycleChange('error', 'The Codex bridge returned malformed JSON.');
      return null;
    }
  }

  private async fetchJson<T>(pathname: string, init: RequestInit, authToken?: string) {
    const headers = new Headers(init.headers ?? {});
    headers.set('Accept', 'application/json');

    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }

    const response = await fetch(this.buildHttpUrl(pathname), {
      ...init,
      headers,
      mode: 'cors'
    });

    if (response.status === 401 || response.status === 403) {
      const errorPayload = await parseErrorPayload(response);
      throw new CodexAuthError(errorPayload ?? 'Authentication is required.');
    }

    if (!response.ok) {
      const errorPayload = await parseErrorPayload(response);
      throw new Error(errorPayload ?? `Codex bridge request failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  private buildHttpUrl(pathname: string) {
    const url = this.getBaseUrl();
    url.pathname = pathname;
    url.search = '';
    return url.toString();
  }

  private buildWebSocketUrl(authToken: string) {
    const socketUrl = this.getBaseUrl();
    socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    socketUrl.pathname = TERMINAL_SOCKET_PATH;
    socketUrl.search = '';
    socketUrl.searchParams.set('sessionId', this.sessionId);
    socketUrl.searchParams.set('authToken', authToken);
    return socketUrl.toString();
  }

  private getBaseUrl() {
    switch (this.bridgeMode) {
      case 'dev':
        return new URL(window.location.origin);
      case 'bridge':
        return new URL(resolveBridgeOrigin());
      case 'auto':
      default:
        return new URL(resolveAutoOrigin());
    }
  }
}

export class CodexAuthError extends Error {}

async function parseErrorPayload(response: Response) {
  try {
    const parsed = (await response.json()) as { error?: string };
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

function resolveAutoOrigin() {
  if (window.location.hostname.endsWith('github.io')) {
    return DEFAULT_REMOTE_ORIGIN;
  }

  return window.location.origin;
}

function resolveBridgeOrigin() {
  const configuredOrigin = import.meta.env.VITE_CODEX_BRIDGE_URL;
  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (isLocalHostname(window.location.hostname)) {
    return DEFAULT_LOCAL_BRIDGE_ORIGIN;
  }

  if (window.location.hostname.endsWith('github.io')) {
    return DEFAULT_REMOTE_ORIGIN;
  }

  return window.location.origin;
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

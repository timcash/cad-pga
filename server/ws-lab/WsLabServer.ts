import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';

const SOCKET_PATH = '/ws-lab';
const PUBLIC_CONFIG_PATH = '/api/ws-lab/public-config';
const HEALTH_PATH = '/api/ws-lab/health';

interface WsLabServerOptions {
  host: string;
  port: number;
  publicOrigin: string;
}

export class WsLabServer {
  private readonly options: WsLabServerOptions;
  private readonly httpServer;
  private readonly webSocketServer: WebSocketServer;
  private readonly startedAt = Date.now();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(options: WsLabServerOptions) {
    this.options = options;
    this.httpServer = createServer(this.handleRequest);
    this.webSocketServer = new WebSocketServer({
      server: this.httpServer,
      path: SOCKET_PATH,
      maxPayload: 16 * 1024
    });
    this.webSocketServer.on('connection', this.handleSocketConnection);
  }

  public async listen() {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      this.httpServer.once('error', rejectPromise);
      this.httpServer.listen(this.options.port, this.options.host, () => {
        this.httpServer.off('error', rejectPromise);
        resolvePromise();
      });
    });

    this.heartbeatTimer = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        sentAt: new Date().toISOString(),
        connectionCount: this.webSocketServer.clients.size
      });
    }, 5000);
  }

  public async close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.webSocketServer.clients.forEach((client) => client.close(1001, 'Server stopping.'));

    await new Promise<void>((resolvePromise, rejectPromise) => {
      this.httpServer.close((error) => {
        if (error) {
          rejectPromise(error);
          return;
        }

        resolvePromise();
      });
    });
  }

  private readonly handleRequest = (request: IncomingMessage, response: ServerResponse) => {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? this.options.host}`);
    const origin = request.headers.origin;

    if (request.method === 'OPTIONS') {
      response.writeHead(204, appendCorsHeaders({ 'Cache-Control': 'no-store' }, origin));
      response.end();
      return;
    }

    if (requestUrl.pathname === PUBLIC_CONFIG_PATH) {
      this.writeJson(
        response,
        200,
        {
          ok: true,
          publicOrigin: this.options.publicOrigin,
          socketPath: SOCKET_PATH,
          allowedOrigins: Array.from(getAllowedOrigins()),
          sessionLabel: 'This server is a local echo and heartbeat target for the Pages route.'
        },
        origin
      );
      return;
    }

    if (requestUrl.pathname === HEALTH_PATH) {
      this.writeJson(
        response,
        200,
        {
          ok: true,
          host: this.options.host,
          port: this.options.port,
          publicOrigin: this.options.publicOrigin,
          uptimeMs: Date.now() - this.startedAt,
          connectionCount: this.webSocketServer.clients.size,
          socketPath: SOCKET_PATH
        },
        origin
      );
      return;
    }

    this.writeJson(
      response,
      404,
      {
        ok: false,
        error: 'Unknown ws-lab endpoint.'
      },
      origin
    );
  };

  private readonly handleSocketConnection = (socket: WebSocket, request: IncomingMessage) => {
    const origin = request.headers.origin;
    if (!isAllowedOrigin(origin)) {
      socket.close(4403, 'Origin not allowed.');
      return;
    }

    const clientId = randomUUID();
    this.send(socket, {
      type: 'welcome',
      clientId,
      connectedAt: new Date().toISOString(),
      origin: origin ?? 'unknown',
      publicOrigin: this.options.publicOrigin,
      note: 'WebSocket tunnel is live.'
    });

    socket.on('message', (payload: RawData) => {
      const text = rawDataToText(payload);
      const parsed = safelyParseJson(text);
      if (parsed && parsed.type === 'ping') {
        this.send(socket, {
          type: 'pong',
          receivedAt: new Date().toISOString(),
          echo: parsed
        });
        return;
      }

      this.send(socket, {
        type: 'echo',
        clientId,
        receivedAt: new Date().toISOString(),
        payload: parsed ?? text
      });
    });
  };

  private broadcast(payload: Record<string, unknown>) {
    const encoded = JSON.stringify(payload);
    this.webSocketServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(encoded);
      }
    });
  }

  private send(socket: WebSocket, payload: Record<string, unknown>) {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(payload));
  }

  private writeJson(response: ServerResponse, statusCode: number, payload: unknown, origin: string | undefined) {
    response.writeHead(
      statusCode,
      appendCorsHeaders(
        {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        },
        origin
      )
    );
    response.end(JSON.stringify(payload));
  }
}

function getAllowedOrigins() {
  const configured = process.env.LEGION_WS_ALLOWED_ORIGINS
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(
    configured?.length
      ? configured
      : [
          'http://localhost:5174',
          'http://127.0.0.1:5174',
          'https://timcash.github.io'
        ]
  );
}

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }

    return getAllowedOrigins().has(parsed.origin);
  } catch {
    return false;
  }
}

function appendCorsHeaders(headers: Record<string, string>, origin: string | undefined) {
  if (!origin || !isAllowedOrigin(origin)) {
    return headers;
  }

  return {
    ...headers,
    'Access-Control-Allow-Origin': new URL(origin).origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin'
  };
}

function rawDataToText(payload: RawData) {
  if (typeof payload === 'string') {
    return payload;
  }

  if (payload instanceof ArrayBuffer) {
    return Buffer.from(payload).toString('utf8');
  }

  return Buffer.from(payload).toString('utf8');
}

function safelyParseJson(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

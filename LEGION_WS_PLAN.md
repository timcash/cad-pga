# Legion WebSocket Tunnel Plan

Goal: prove that a static GitHub Pages route can open a `wss://` connection to `legion.dialtone.earth`, where Cloudflare Tunnel forwards traffic back to a local WebSocket server running on this Windows machine.

## Architecture

- GitHub Pages hosts a static client at `/legion/`.
- The browser connects to `wss://legion.dialtone.earth/ws-lab`.
- Cloudflare handles TLS and the WebSocket upgrade at the edge.
- `cloudflared` runs on this host and forwards the request to `http://127.0.0.1:4196`.
- A small local HTTP + WebSocket server accepts only known origins:
  - `https://timcash.github.io`
  - `http://localhost:5174`
  - `http://127.0.0.1:5174`

## Why this is the right demo

- It isolates the tunnel path from the Codex PTY complexity.
- It proves cross-origin browser WebSockets from GitHub Pages.
- It gives us a safe echo/heartbeat target before we put anything sensitive behind the tunnel.
- Once it works, the same tunnel pattern can back `/codex/`.

## Deliverables

- A static `/legion/` page in the Vite build.
- A local `ws`-based echo server with:
  - `GET /api/ws-lab/public-config`
  - `GET /api/ws-lab/health`
  - `WS /ws-lab`
- A background daemon for the local server.
- A Cloudflare provision/start script that:
  - creates or reuses a named tunnel
  - creates an exact `legion.dialtone.earth` CNAME to that tunnel
  - starts `cloudflared` with the tunnel token and local URL

## Connection modes in the page

- `Auto`
  - on localhost: use the Vite dev proxy
  - on GitHub Pages: use `https://legion.dialtone.earth`
- `Dev`
  - use the current page origin and Vite proxy
- `Legion`
  - always target `https://legion.dialtone.earth`

## Verification checklist

1. Local server responds on `http://127.0.0.1:4196/api/ws-lab/health`.
2. `http://localhost:5174/legion/` connects in `Dev` mode.
3. `http://localhost:5174/legion/?mode=legion` connects through the public tunnel.
4. After push, `https://timcash.github.io/cad-pga/legion/` connects in `Auto` mode.
5. The demo log shows:
   - server welcome
   - browser message echo
   - periodic heartbeat

## Risks to watch

- `legion.dialtone.earth` currently resolves through a wildcard record, so adding an exact CNAME will override that wildcard for this host.
- A named tunnel and a quick tunnel are different modes; the stable hostname requires the named tunnel path.
- WebSockets do not use normal CORS, so the local server must validate the `Origin` header itself.

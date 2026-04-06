# Codex Route Plan

Goal: add a live `/codex` route to `cad-pga` that renders an `xterm.js` terminal in the browser, connects it to the local Codex CLI through a PTY bridge, and supports a Cloudflare Tunnel path so the GitHub Pages site can reach the local machine.

This plan is intentionally biased toward the simplest working architecture:

- GitHub Pages serves the static UI.
- A local daemon runs on this computer.
- The daemon launches the real `codex` CLI in a PTY.
- A Cloudflare Tunnel forwards `codex.dialtone.earth` to the local daemon.
- The `/codex` page authenticates with a short-lived password gate before it can attach to the terminal.

## Working goals

- `/codex/` exists in the static Pages build.
- The page uses `xterm.js`, not a fake terminal renderer.
- The browser terminal talks to a real local `codex` process.
- The browser prompts for a locally configured bridge password.
- A successful password unlocks that browser session for 10 minutes.
- After 10 minutes, the browser must re-authenticate.
- The daemon can start the local bridge and an optional Cloudflare tunnel.
- The setup stays mobile-friendly enough to match the rest of the repo shell.

## Architecture

### Static frontend

- Add a new Vite multi-page route:
  - `codex/index.html`
- Add bundled frontend modules:
  - `src/codex/CodexTerminalPage.ts`
  - `src/codex/CodexTerminalView.ts`
  - `src/codex/CodexTerminalClient.ts`
  - `src/codex/CodexAuthStore.ts`
  - `src/codex/codexTerminal.css`
- Reuse the route feel from `guitar-tabs`, but adapt it to the simpler `cad-pga` site structure.

### Local bridge server

- Add a Node server entry:
  - `server/index.ts`
- Add bridge modules:
  - `server/codex/CodexBridgeServer.ts`
  - `server/codex/CodexExecutableResolver.ts`
  - `server/codex/CodexPtySession.ts`
  - `server/codex/CodexSessionRegistry.ts`
  - `server/codex/CodexAuthRegistry.ts`
  - `server/codex/Cors.ts`
- Reuse the working PTY bridge shape from `guitar-tabs`.
- Extend it with token-based browser auth so GitHub Pages can connect cross-origin without relying on third-party cookies.

### Browser auth model

- The password is checked by the daemon, not by the static page.
- `POST /api/codex/auth/login` accepts the password.
- A successful login returns a short-lived opaque auth token and expiry time.
- The browser stores that token in `sessionStorage`.
- The token is attached to:
  - `Authorization: Bearer ...` for HTTP endpoints
  - `authToken=...` on the WebSocket URL
- The server expires auth after 10 minutes.
- Expired auth forces the UI back to the locked state.

## Tunnel model

### Target public origin

- Static Pages site:
  - `https://timcash.github.io/cad-pga/codex/`
- Tunnel origin:
  - `https://codex.dialtone.earth`

### Daemon + tunnel flow

- The daemon listens locally, for example:
  - `http://127.0.0.1:4176`
- Cloudflare Tunnel forwards:
  - `https://codex.dialtone.earth` -> `http://127.0.0.1:4176`
- The static `/codex/` page points to `https://codex.dialtone.earth` when running on GitHub Pages.
- Local dev keeps using same-origin Vite proxying.

### Tunnel token strategy

- Prefer environment variables already used by local tooling:
  - `CODEX_TUNNEL_TOKEN`
  - `CF_TUNNEL_TOKEN_CODEX`
  - `CF_TUNNEL_TOKEN`
- If no token is available, fail with a clear message instead of guessing.
- Add a helper to locate `cloudflared`, with room for a later local download/install path if needed.

## Daemon commands

Add npm commands that are simple to remember:

- `npm run codex:dev`
  - Vite dev server plus local bridge
- `npm run codex:bridge`
  - foreground bridge server only
- `npm run codex:daemon:start`
  - start background daemon
- `npm run codex:daemon:stop`
  - stop background daemon
- `npm run codex:daemon:status`
  - report daemon status
- `npm run codex:tunnel`
  - foreground Cloudflare tunnel

The background daemon should:

- write a PID file
- write logs to a repo-local runtime directory
- launch the bridge
- optionally launch `cloudflared`

## Repo wiring

- Extend `vite.config.js` for the `/codex` page.
- Add frontend dependencies:
  - `@xterm/xterm`
  - `@xterm/addon-fit`
- Add backend dependencies:
  - `node-pty`
  - `ws`
- Add server TypeScript config if needed.
- Update the homepage and README with the new `/codex` route.
- Update the service worker cache list to include `/codex/`.

## Security note

This implementation is intentionally convenience-first because the user explicitly requested a shared password and a public tunnel path.

That means:

- the password must come from a local env value such as `CODEX_BRIDGE_PASSWORD`
- the session token should expire after 10 minutes
- cross-origin access should be restricted to known allowed origins

## Verification checklist

### Frontend

- `npm run build`
- `/codex/` loads in the built site
- lock screen appears before auth
- successful auth mounts the terminal
- expiry returns the page to the locked state

### Bridge

- `npm run codex:bridge`
- `GET /api/codex/health` rejects when unauthenticated
- `POST /api/codex/auth/login` accepts the password
- authenticated websocket session launches the real `codex` CLI

### Tunnel

- daemon can resolve `cloudflared` or fail clearly
- tunnel command targets `http://127.0.0.1:4176`
- README explains required token env vars

## Phase order

1. Add this plan file.
2. Port the `/codex` frontend into `cad-pga`.
3. Port the PTY bridge into `cad-pga`.
4. Add password auth and 10-minute token expiry.
5. Add daemon/tunnel scripts.
6. Wire `/codex` into Pages build, README, and service worker.
7. Verify locally, then push.

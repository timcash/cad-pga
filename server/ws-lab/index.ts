import { WsLabServer } from './WsLabServer';

const host = process.env.LEGION_WS_HOST ?? '127.0.0.1';
const port = Number(process.env.LEGION_WS_PORT ?? 4196);
const publicOrigin = process.env.LEGION_WS_PUBLIC_ORIGIN ?? 'https://legion.dialtone.earth';

const server = new WsLabServer({
  host,
  port,
  publicOrigin
});

server
  .listen()
  .then(() => {
    console.log(`[ws-lab] Listening on http://${host}:${port}`);
    console.log(`[ws-lab] Public origin: ${publicOrigin}`);
    console.log('[ws-lab] WebSocket path: /ws-lab');
  })
  .catch((error) => {
    console.error('[ws-lab] Failed to start:', error);
    process.exit(1);
  });

const shutdown = async () => {
  await server.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type ChildProcess } from 'node:child_process';
import { WsLabServer } from './WsLabServer';
import { startLegionTunnel } from './CloudflareLegionProvision';

const workspaceRoot = process.cwd();
const runtimeDir = resolve(workspaceRoot, '.runtime', 'legion-ws');
const statusFile = resolve(runtimeDir, 'status.json');
const host = process.env.LEGION_WS_HOST ?? '127.0.0.1';
const port = Number(process.env.LEGION_WS_PORT ?? 4196);
const publicOrigin = process.env.LEGION_WS_PUBLIC_ORIGIN ?? 'https://legion.dialtone.earth';
const localUrl = `http://${host}:${port}`;
const shouldStartTunnel = process.argv.includes('--tunnel') || process.env.LEGION_WS_TUNNEL === '1';

mkdirSync(runtimeDir, { recursive: true });

const server = new WsLabServer({
  host,
  port,
  publicOrigin
});

let tunnelCommand = '';
let tunnelState = 'disabled';
let tunnelChild: ChildProcess | null = null;
let tunnelHostname = publicOrigin;
let tunnelWebsocketUrl = `${publicOrigin.replace(/^http/, 'ws')}/ws-lab`;

void start();

async function start() {
  writeStatus('starting');
  await server.listen();

  if (shouldStartTunnel) {
    try {
      const tunnel = await startLegionTunnel({
        workspaceRoot,
        localUrl,
        stdio: 'inherit'
      });
      tunnelChild = tunnel.child;
      tunnelCommand = tunnel.commandLabel;
      tunnelState = 'running';
      tunnelHostname = tunnel.provisioned.publicOrigin;
      tunnelWebsocketUrl = tunnel.provisioned.websocketUrl;
      tunnelChild.on('exit', () => {
        tunnelState = 'stopped';
        writeStatus('running');
      });
    } catch (error) {
      tunnelState = `error: ${error instanceof Error ? error.message : 'Unable to start tunnel.'}`;
    }
  }

  writeStatus('running');
}

async function shutdown() {
  writeStatus('stopping');
  tunnelChild?.kill();
  await server.close();
  writeStatus('stopped');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function writeStatus(state: string) {
  writeFileSync(
    statusFile,
    JSON.stringify(
      {
        state,
        pid: process.pid,
        host,
        port,
        localUrl,
        publicOrigin,
        tunnelState,
        tunnelCommand,
        tunnelHostname,
        tunnelWebsocketUrl,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

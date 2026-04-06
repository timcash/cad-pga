import { existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { startLegionTunnel, ensureLegionTunnelProvisioned } from './CloudflareLegionProvision';

const workspaceRoot = process.cwd();
const runtimeDir = resolve(workspaceRoot, '.runtime', 'legion-ws');
const pidFile = resolve(runtimeDir, 'daemon.pid');
const statusFile = resolve(runtimeDir, 'status.json');
const logFile = resolve(runtimeDir, 'daemon.log');

mkdirSync(runtimeDir, { recursive: true });

const command = process.argv[2] ?? 'status';

switch (command) {
  case 'start':
    startDaemon(process.argv.includes('--tunnel'));
    break;
  case 'stop':
    stopDaemon();
    break;
  case 'status':
    printStatus();
    break;
  case 'provision':
    void provisionTunnel();
    break;
  case 'tunnel':
    void runTunnelForeground();
    break;
  default:
    console.error(`Unknown legion ws command: ${command}`);
    process.exit(1);
}

function startDaemon(withTunnel: boolean) {
  const existingPid = readPid();
  if (existingPid && isProcessRunning(existingPid)) {
    console.log(`Legion ws daemon already running with pid ${existingPid}.`);
    return;
  }

  const args = ['--import', 'tsx', resolve(workspaceRoot, 'server', 'ws-lab', 'worker.ts')];
  if (withTunnel) {
    args.push('--tunnel');
  }

  const stdoutFd = openSync(logFile, 'a');
  const stderrFd = openSync(logFile, 'a');
  const child = spawn(process.execPath, args, {
    cwd: workspaceRoot,
    detached: true,
    stdio: ['ignore', stdoutFd, stderrFd],
    windowsHide: true,
    env: {
      ...process.env
    }
  });

  child.unref();
  writeFileSync(pidFile, String(child.pid));
  console.log(`Started legion ws daemon with pid ${child.pid}.`);
}

function stopDaemon() {
  const pid = readPid();
  if (!pid) {
    console.log('Legion ws daemon is not running.');
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore'
    });
  } else {
    process.kill(pid, 'SIGTERM');
  }

  if (existsSync(pidFile)) {
    unlinkSync(pidFile);
  }

  console.log(`Stopped legion ws daemon pid ${pid}.`);
}

function printStatus() {
  const pid = readPid();
  const isRunning = pid ? isProcessRunning(pid) : false;

  if (existsSync(statusFile)) {
    const status = JSON.parse(readFileSync(statusFile, 'utf8')) as Record<string, unknown>;
    console.log(JSON.stringify({ ...status, state: isRunning ? status.state : 'stopped', isRunning }, null, 2));
    return;
  }

  console.log(JSON.stringify({ isRunning, pid: pid ?? null }, null, 2));
}

async function provisionTunnel() {
  const provisioned = await ensureLegionTunnelProvisioned({
    workspaceRoot
  });

  console.log(
    JSON.stringify(
      {
        hostname: provisioned.hostname,
        publicOrigin: provisioned.publicOrigin,
        websocketUrl: provisioned.websocketUrl,
        tunnelId: provisioned.tunnelId,
        tunnelName: provisioned.tunnelName,
        createdTunnel: provisioned.createdTunnel,
        dnsAction: provisioned.dnsAction
      },
      null,
      2
    )
  );
}

async function runTunnelForeground() {
  const host = process.env.LEGION_WS_HOST ?? '127.0.0.1';
  const port = Number(process.env.LEGION_WS_PORT ?? 4196);
  const localUrl = `http://${host}:${port}`;
  const tunnel = await startLegionTunnel({
    workspaceRoot,
    localUrl,
    stdio: 'inherit'
  });
  console.log(`[legion-ws] ${tunnel.commandLabel}`);
  console.log(
    JSON.stringify(
      {
        hostname: tunnel.provisioned.hostname,
        publicOrigin: tunnel.provisioned.publicOrigin,
        websocketUrl: tunnel.provisioned.websocketUrl,
        tunnelId: tunnel.provisioned.tunnelId,
        tunnelName: tunnel.provisioned.tunnelName,
        createdTunnel: tunnel.provisioned.createdTunnel,
        dnsAction: tunnel.provisioned.dnsAction
      },
      null,
      2
    )
  );
}

function readPid() {
  if (!existsSync(pidFile)) {
    return null;
  }

  const value = Number(readFileSync(pidFile, 'utf8'));
  return Number.isFinite(value) ? value : null;
}

function isProcessRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

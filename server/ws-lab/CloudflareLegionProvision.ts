import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { ensureCloudflaredBinary } from '../daemon/CloudflareTunnel';

const DEFAULT_TUNNEL_NAME = 'legion-ws-demo';
const DEFAULT_HOSTNAME = 'legion.dialtone.earth';
const DEFAULT_ZONE = 'dialtone.earth';

interface CloudflareEnvelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ message?: string }>;
}

interface TunnelRecord {
  id: string;
  name: string;
}

interface CloudflareConfig {
  apiToken: string;
  accountId: string;
}

export interface LegionTunnelProvisionResult {
  hostname: string;
  publicOrigin: string;
  websocketUrl: string;
  tunnelId: string;
  tunnelName: string;
  zoneId: string;
  createdTunnel: boolean;
  dnsAction: 'created' | 'updated' | 'unchanged';
  runToken: string;
}

export async function ensureLegionTunnelProvisioned(options: {
  workspaceRoot: string;
  hostname?: string;
  tunnelName?: string;
}) {
  const hostname = (options.hostname ?? DEFAULT_HOSTNAME).trim();
  const tunnelName = (options.tunnelName ?? DEFAULT_TUNNEL_NAME).trim();
  const zoneName = resolveZoneName(hostname);
  const config = resolveCloudflareConfig(options.workspaceRoot);
  const headers = {
    Authorization: `Bearer ${config.apiToken}`,
    'Content-Type': 'application/json'
  };

  const zone = await fetchCloudflare<{ id: string }[]>(
    `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zoneName)}`,
    {
      headers
    }
  );
  const zoneId = zone[0]?.id;
  if (!zoneId) {
    throw new Error(`Cloudflare zone ${zoneName} was not found.`);
  }

  const listedTunnels = await fetchCloudflare<TunnelRecord[]>(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/tunnels?name=${encodeURIComponent(tunnelName)}`,
    {
      headers
    }
  );

  let tunnelId = listedTunnels.find((item) => item.name === tunnelName)?.id ?? '';
  let createdTunnel = false;

  if (!tunnelId) {
    const secret = randomBytes(32).toString('base64');
    const created = await fetchCloudflare<{ id: string }>(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/tunnels`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: tunnelName,
          tunnel_secret: secret
        })
      }
    );
    tunnelId = created.id;
    createdTunnel = true;
  }

  if (!tunnelId) {
    throw new Error(`Unable to resolve a Cloudflare tunnel id for ${tunnelName}.`);
  }

  const runToken = await fetchCloudflare<string>(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/cfd_tunnel/${tunnelId}/token`,
    {
      headers
    }
  );

  const dnsAction = await ensureDnsRecord({
    headers,
    zoneId,
    hostname,
    target: `${tunnelId}.cfargotunnel.com`
  });

  return {
    hostname,
    publicOrigin: `https://${hostname}`,
    websocketUrl: `wss://${hostname}/ws-lab`,
    tunnelId,
    tunnelName,
    zoneId,
    createdTunnel,
    dnsAction,
    runToken
  } satisfies LegionTunnelProvisionResult;
}

export async function startLegionTunnel(options: {
  workspaceRoot: string;
  localUrl: string;
  stdio: 'inherit' | ['ignore', number, number];
}) {
  const provisioned = await ensureLegionTunnelProvisioned({
    workspaceRoot: options.workspaceRoot
  });
  const executablePath = await ensureCloudflaredBinary(options.workspaceRoot);
  const args = ['tunnel', 'run', '--token', provisioned.runToken, '--url', options.localUrl];
  const child = spawn(executablePath, args, {
    cwd: options.workspaceRoot,
    stdio: options.stdio,
    windowsHide: true
  });

  return {
    child,
    commandLabel: `${executablePath} tunnel run --token [redacted] --url ${options.localUrl}`,
    provisioned
  };
}

function resolveCloudflareConfig(workspaceRoot: string): CloudflareConfig {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (apiToken && accountId) {
    return { apiToken, accountId };
  }

  const candidates = [
    resolve(workspaceRoot, '..', 'dialtone', 'env', 'dialtone.json'),
    join(homedir(), 'dialtone', 'env', 'dialtone.json')
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as {
      CLOUDFLARE_API_TOKEN?: string;
      CLOUDFLARE_ACCOUNT_ID?: string;
    };

    if (parsed.CLOUDFLARE_API_TOKEN?.trim() && parsed.CLOUDFLARE_ACCOUNT_ID?.trim()) {
      return {
        apiToken: parsed.CLOUDFLARE_API_TOKEN.trim(),
        accountId: parsed.CLOUDFLARE_ACCOUNT_ID.trim()
      };
    }
  }

  throw new Error('Cloudflare credentials were not found in env vars or dialtone/env/dialtone.json.');
}

async function ensureDnsRecord(options: {
  headers: Record<string, string>;
  zoneId: string;
  hostname: string;
  target: string;
}): Promise<'created' | 'updated' | 'unchanged'> {
  const existing = await fetchCloudflare<
    Array<{ id: string; type: string; name: string; content: string; proxied: boolean }>
  >(
    `https://api.cloudflare.com/client/v4/zones/${options.zoneId}/dns_records?name=${encodeURIComponent(options.hostname)}`,
    {
      headers: options.headers
    }
  );

  if (existing.length > 0) {
    const sameRecord = existing.find(
      (record) =>
        record.type === 'CNAME' &&
        record.name === options.hostname &&
        record.content === options.target &&
        record.proxied === true
    );

    if (sameRecord) {
      return 'unchanged';
    }

    const exactRecord = existing[0];
    if (exactRecord.type !== 'CNAME') {
      throw new Error(`Existing exact DNS record for ${options.hostname} is type ${exactRecord.type}, not CNAME.`);
    }

    await fetchCloudflare(
      `https://api.cloudflare.com/client/v4/zones/${options.zoneId}/dns_records/${exactRecord.id}`,
      {
        method: 'PUT',
        headers: options.headers,
        body: JSON.stringify({
          type: 'CNAME',
          name: options.hostname,
          content: options.target,
          proxied: true,
          ttl: 1
        })
      }
    );
    return 'updated';
  }

  await fetchCloudflare(
    `https://api.cloudflare.com/client/v4/zones/${options.zoneId}/dns_records`,
    {
      method: 'POST',
      headers: options.headers,
      body: JSON.stringify({
        type: 'CNAME',
        name: options.hostname,
        content: options.target,
        proxied: true,
        ttl: 1
      })
    }
  );
  return 'created';
}

async function fetchCloudflare<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as CloudflareEnvelope<T>;

  if (!response.ok || !payload.success) {
    const message = payload.errors?.[0]?.message ?? `Cloudflare request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload.result;
}

function resolveZoneName(hostname: string) {
  if (hostname.endsWith(`.${DEFAULT_ZONE}`)) {
    return DEFAULT_ZONE;
  }

  const [, ...rest] = hostname.split('.');
  return rest.join('.');
}

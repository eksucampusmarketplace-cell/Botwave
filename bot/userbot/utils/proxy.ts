/**
 * Proxy rotation for Telegram userbot MTProto connections.
 * Uses SOCKS5 proxies (required by MTProto/GramJS) with round-robin rotation.
 * Never falls back to VPS IP - if no proxies configured, connections are refused.
 */

import { SocksProxyAgent } from 'socks-proxy-agent';

export interface ProxyEntry {
  host: string;
  port: number;
  username?: string;
  password?: string;
  socksType: 5;
}

const USERBOT_PROXY_LIST: ProxyEntry[] = (process.env.USERBOT_PROXY_LIST || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)
  .map(entry => {
    const parts = entry.split(':');
    if (parts.length < 2) return null;
    const [host, port, username, password] = parts;
    return {
      host,
      port: parseInt(port, 10),
      username: username || undefined,
      password: password || undefined,
      socksType: 5 as const,
    };
  })
  .filter((p): p is NonNullable<typeof p> => p !== null) as ProxyEntry[];

let proxyCounter = 0;
const proxyHealth: Map<string, { failures: number; lastFailure: number }> = new Map();

const MAX_FAILURES = 5;
const FAILURE_RESET_MS = 5 * 60 * 1000;

function proxyKey(proxy: ProxyEntry): string {
  return `${proxy.host}:${proxy.port}`;
}

export function getProxyCount(): number {
  return USERBOT_PROXY_LIST.length;
}

export function getNextProxy(): ProxyEntry | null {
  if (USERBOT_PROXY_LIST.length === 0) return null;

  const now = Date.now();
  let attempts = 0;

  while (attempts < USERBOT_PROXY_LIST.length) {
    const proxy = USERBOT_PROXY_LIST[proxyCounter % USERBOT_PROXY_LIST.length];
    proxyCounter++;
    attempts++;

    const key = proxyKey(proxy);
    const health = proxyHealth.get(key);

    if (health && health.failures >= MAX_FAILURES) {
      if (now - health.lastFailure > FAILURE_RESET_MS) {
        proxyHealth.delete(key);
      } else {
        continue;
      }
    }

    return proxy;
  }

  // All proxies exhausted - reset all and try first
  proxyHealth.clear();
  return USERBOT_PROXY_LIST[0] || null;
}

export function recordProxyFailure(proxy: ProxyEntry): void {
  const key = proxyKey(proxy);
  const health = proxyHealth.get(key) || { failures: 0, lastFailure: 0 };
  health.failures++;
  health.lastFailure = Date.now();
  proxyHealth.set(key, health);
  console.log(`[USERBOT-PROXY] Failure recorded for ${key} (total: ${health.failures})`);
}

export function recordProxySuccess(proxy: ProxyEntry): void {
  const key = proxyKey(proxy);
  proxyHealth.delete(key);
}

export function createSocksAgent(proxy: ProxyEntry): SocksProxyAgent {
  const auth = proxy.username && proxy.password
    ? `${proxy.username}:${proxy.password}@`
    : '';
  const url = `socks5://${auth}${proxy.host}:${proxy.port}`;
  return new SocksProxyAgent(url);
}

export function getGramJSProxyConfig(proxy: ProxyEntry): {
  ip: string;
  port: number;
  socksType: 5;
  username?: string;
  password?: string;
} {
  return {
    ip: proxy.host,
    port: proxy.port,
    socksType: 5,
    username: proxy.username,
    password: proxy.password,
  };
}

export function logProxyStatus(): void {
  if (USERBOT_PROXY_LIST.length === 0) {
    console.warn('[USERBOT-PROXY] WARNING: No proxies configured (USERBOT_PROXY_LIST is empty)');
    console.warn('[USERBOT-PROXY] Userbot will connect using server IP - NOT recommended');
  } else {
    console.log(`[USERBOT-PROXY] ${USERBOT_PROXY_LIST.length} SOCKS5 proxies loaded`);
    USERBOT_PROXY_LIST.forEach((p, i) => {
      console.log(`[USERBOT-PROXY]   #${i + 1}: ${p.host}:${p.port} (user: ${p.username || 'none'})`);
    });
  }
}

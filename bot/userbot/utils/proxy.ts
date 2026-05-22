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

// Strip ALL whitespace (incl. \r, \n, tabs) from each entry. `.trim()` would
// only handle leading/trailing — but proxy lists exported from Windows tools
// can contain stray CR bytes mid-string, which silently corrupts the password
// field and makes SOCKS5 auth fail.
const USERBOT_PROXY_LIST: ProxyEntry[] = (process.env.USERBOT_PROXY_LIST || '')
  .split(',')
  .map(p => p.replace(/\s+/g, ''))
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

// Circuit breaker: track when all proxies were exhausted
let allProxiesExhaustedAt = 0;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minute backoff when all proxies fail

function proxyKey(proxy: ProxyEntry): string {
  return `${proxy.host}:${proxy.port}`;
}

export function getProxyCount(): number {
  return USERBOT_PROXY_LIST.length;
}

/**
 * Get a sticky proxy for a session. Same session always gets the same proxy
 * (based on hash of session ID) to prevent WhatsApp/Telegram from detecting
 * IP changes and forcing re-authentication.
 */
export function getStickyProxy(sessionId: string): ProxyEntry | null {
  if (USERBOT_PROXY_LIST.length === 0) return null;

  // Simple hash of session ID to get a stable index
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash + sessionId.charCodeAt(i)) | 0;
  }
  const baseIndex = Math.abs(hash) % USERBOT_PROXY_LIST.length;

  const now = Date.now();
  // Try the sticky proxy first, then fall back to neighbors
  for (let offset = 0; offset < USERBOT_PROXY_LIST.length; offset++) {
    const proxy = USERBOT_PROXY_LIST[(baseIndex + offset) % USERBOT_PROXY_LIST.length];
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

  // All proxies exhausted — circuit breaker: wait before retrying
  if (now - allProxiesExhaustedAt < CIRCUIT_BREAKER_COOLDOWN_MS) {
    console.warn(`[USERBOT-PROXY] Circuit breaker open - all proxies failed, waiting ${Math.round((CIRCUIT_BREAKER_COOLDOWN_MS - (now - allProxiesExhaustedAt)) / 1000)}s`);
    return null;
  }

  allProxiesExhaustedAt = now;
  console.warn(`[USERBOT-PROXY] All proxies exhausted - resetting health and entering 5min cooldown`);
  proxyHealth.clear();
  return USERBOT_PROXY_LIST[baseIndex] || null;
}

export function getNextProxy(): ProxyEntry | null {
  if (USERBOT_PROXY_LIST.length === 0) return null;

  const now = Date.now();

  // Circuit breaker check
  if (allProxiesExhaustedAt > 0 && now - allProxiesExhaustedAt < CIRCUIT_BREAKER_COOLDOWN_MS) {
    console.warn(`[USERBOT-PROXY] Circuit breaker open - waiting`);
    return null;
  }

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

  // All proxies exhausted - circuit breaker
  allProxiesExhaustedAt = now;
  console.warn(`[USERBOT-PROXY] All proxies exhausted - circuit breaker activated for 5 minutes`);
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

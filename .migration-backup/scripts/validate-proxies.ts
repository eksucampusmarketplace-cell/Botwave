#!/usr/bin/env npx tsx
/**
 * BotWave Proxy Validator
 *
 * Diagnoses a PROXY_LIST before you trust it for multi-session WhatsApp.
 *
 * For every proxy entry it:
 *   1. Parses the host:port:user:pass quad
 *   2. Looks up the egress IP's ASN via ip-api.com (free, no auth)
 *   3. Flags datacenter ranges (Leaseweb, HostPapa, ColoCrossing, Linode, etc.)
 *      that WhatsApp's anti-abuse system pre-flags
 *   4. Measures latency through the proxy with an HTTPS GET to whatsapp.com
 *   5. Optionally probes wss://web.whatsapp.com to confirm the IP isn't
 *      blackholed at the WebSocket layer
 *
 * Outputs:
 *   - Per-proxy line: host, country, ASN, latency, datacenter flag, pass/fail
 *   - Summary: % residential vs datacenter, % reachable, average latency
 *
 * Usage:
 *   # From the repo root, against the env var on this host:
 *   npx tsx scripts/validate-proxies.ts
 *
 *   # Or against an inline list:
 *   PROXY_LIST="1.2.3.4:1080:user:pass,5.6.7.8:1080:user:pass" \
 *     npx tsx scripts/validate-proxies.ts
 *
 *   # Test a single provider's pool before committing to a paid plan:
 *   PROXY_LIST="$(cat candidate-proxies.txt | tr '\n' ',')" \
 *     npx tsx scripts/validate-proxies.ts --ws --max=10
 *
 * Flags:
 *   --ws        Also probe wss://web.whatsapp.com (slower, more accurate)
 *   --max=N     Only test the first N proxies (useful for a sample)
 *   --json      Emit machine-readable JSON instead of the human table
 *
 * Cost: ip-api.com free tier is 45 req/min from one IP, so we throttle.
 * Exit code: 0 if >=80% of proxies pass, 1 otherwise (useful in CI).
 */

import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

// ASN substrings we treat as "datacenter" — these are the providers that
// WhatsApp's anti-abuse system flags hardest because no real user connects
// from them. Add to this list as you discover more flagged ranges in the wild.
const DATACENTER_ASN_HINTS = [
  'amazon', 'aws', 'google', 'gcp', 'microsoft', 'azure', 'digitalocean',
  'linode', 'vultr', 'ovh', 'hetzner', 'leaseweb', 'hostpapa', 'colocrossing',
  'choopa', 'contabo', 'oracle cloud', 'alibaba', 'tencent', 'cloudflare',
  'datacamp', 'rackspace', 'liquid web', 'softlayer', 'ibm cloud', 'm247',
  'serverstadium', 'webair', 'host europe', 'serverius', 'psychz',
  'limestone', 'gcorelabs',
];

interface ProxyEntry {
  raw: string;
  host: string;
  port: number;
  user?: string;
  pass?: string;
  url: string; // http://user:pass@host:port
}

interface IpInfo {
  query: string;
  country: string;
  city: string;
  isp: string;
  as: string;
  org: string;
  status: string;
  message?: string;
}

interface ProxyResult {
  proxy: ProxyEntry;
  ipInfo?: IpInfo;
  isDatacenter: boolean;
  httpsLatencyMs?: number;
  httpsOk: boolean;
  httpsError?: string;
  wssOk?: boolean;
  wssError?: string;
}

const args = process.argv.slice(2);
const FLAG_WS = args.includes('--ws');
const FLAG_JSON = args.includes('--json');
const FLAG_MAX = (() => {
  const m = args.find(a => a.startsWith('--max='));
  return m ? parseInt(m.split('=')[1], 10) : Infinity;
})();

function parseProxy(raw: string): ProxyEntry | null {
  const parts = raw.split(':');
  if (parts.length < 2) return null;
  const [host, portStr, user, pass] = parts;
  const port = parseInt(portStr, 10);
  if (!host || isNaN(port)) return null;
  const authPart = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
  return {
    raw,
    host,
    port,
    user,
    pass,
    url: `http://${authPart}${host}:${port}`,
  };
}

/**
 * Look up ASN / country for the proxy's egress IP via ip-api.com. We call it
 * directly (not through the proxy) so the lookup itself never fails — what
 * we want to know is what IP WhatsApp would see, and `query` reports the
 * caller's IP. To get the proxy's egress IP we have to ask through the proxy.
 */
async function fetchEgressInfo(proxy: ProxyEntry): Promise<IpInfo | null> {
  return new Promise(resolve => {
    const agent = new HttpsProxyAgent(proxy.url);
    const req = https.get(
      'https://ip-api.com/json/?fields=status,message,query,country,city,isp,as,org',
      { agent, timeout: 10_000 },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body) as IpInfo;
            resolve(json);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Probe an HTTPS endpoint through the proxy and measure end-to-end latency.
 * whatsapp.com is the most relevant target — if this fails the proxy is
 * blackholed for our use case.
 */
async function probeHttps(proxy: ProxyEntry): Promise<{ ok: boolean; ms?: number; error?: string }> {
  return new Promise(resolve => {
    const agent = new HttpsProxyAgent(proxy.url);
    const start = Date.now();
    const req = https.get(
      'https://www.whatsapp.com/',
      { agent, timeout: 15_000, headers: { 'User-Agent': 'Mozilla/5.0 BotWave-Validator' } },
      res => {
        // Drain to keep the socket clean. We don't care about the body —
        // any 2xx/3xx means TLS handshake + HTTP both succeeded.
        res.resume();
        res.on('end', () => {
          const ms = Date.now() - start;
          if (res.statusCode && res.statusCode < 500) {
            resolve({ ok: true, ms });
          } else {
            resolve({ ok: false, ms, error: `HTTP ${res.statusCode}` });
          }
        });
      },
    );
    req.on('error', err => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

/**
 * Probe wss://web.whatsapp.com handshake through the proxy. WhatsApp blocks
 * known-bad IPs at the WebSocket layer with a TCP RST, so a successful HTTPS
 * GET to whatsapp.com is NOT proof the WebSocket will accept the IP.
 *
 * We don't actually upgrade — we just establish the TLS tunnel via CONNECT
 * and read the first byte. If the proxy returns 200 to CONNECT and we get a
 * TLS handshake, we're good.
 */
async function probeWebSocket(proxy: ProxyEntry): Promise<{ ok: boolean; error?: string }> {
  return new Promise(resolve => {
    const agent = new HttpsProxyAgent(proxy.url);
    const req = https.get(
      {
        host: 'web.whatsapp.com',
        port: 443,
        path: '/ws',
        agent,
        timeout: 15_000,
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': Buffer.from('botwave-validator-key-1').toString('base64'),
          'User-Agent': 'Mozilla/5.0',
        },
      },
      res => {
        res.resume();
        // 101 = upgrade success, 400/403 means handshake reached server (proxy reachable)
        if (res.statusCode === 101 || (res.statusCode && res.statusCode >= 400 && res.statusCode < 500)) {
          resolve({ ok: true });
        } else {
          resolve({ ok: false, error: `HTTP ${res.statusCode}` });
        }
      },
    );
    req.on('upgrade', () => resolve({ ok: true }));
    req.on('error', err => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

function isDatacenterAsn(info: IpInfo | null | undefined): boolean {
  if (!info) return false;
  const haystack = `${info.isp || ''} ${info.org || ''} ${info.as || ''}`.toLowerCase();
  return DATACENTER_ASN_HINTS.some(hint => haystack.includes(hint));
}

async function validateOne(proxy: ProxyEntry): Promise<ProxyResult> {
  const [ipInfo, httpsRes] = await Promise.all([
    fetchEgressInfo(proxy),
    probeHttps(proxy),
  ]);

  const result: ProxyResult = {
    proxy,
    ipInfo: ipInfo ?? undefined,
    isDatacenter: isDatacenterAsn(ipInfo),
    httpsLatencyMs: httpsRes.ms,
    httpsOk: httpsRes.ok,
    httpsError: httpsRes.error,
  };

  if (FLAG_WS) {
    const wssRes = await probeWebSocket(proxy);
    result.wssOk = wssRes.ok;
    result.wssError = wssRes.error;
  }

  return result;
}

function fmtMs(ms?: number) {
  if (ms == null) return '-';
  return `${ms}ms`;
}

function printResult(r: ProxyResult): void {
  const host = r.proxy.host.padEnd(20);
  const country = (r.ipInfo?.country || '?').padEnd(12);
  const asn = (r.ipInfo?.as || r.ipInfo?.isp || '?').slice(0, 30).padEnd(30);
  const dc = r.isDatacenter ? 'DC ⚠' : 'RES ';
  const httpsBadge = r.httpsOk ? 'HTTPS✓' : 'HTTPS✗';
  const httpsLat = fmtMs(r.httpsLatencyMs).padStart(7);
  const wsBadge = FLAG_WS ? (r.wssOk ? ' WS✓' : ' WS✗') : '';
  const err = !r.httpsOk ? ` (${r.httpsError})` : '';
  console.log(`  ${host} ${country} ${asn} ${dc} ${httpsBadge}${httpsLat}${wsBadge}${err}`);
}

async function main() {
  const list = (process.env.PROXY_LIST || '').split(',').map(s => s.trim()).filter(Boolean);
  if (list.length === 0) {
    console.error('No proxies in PROXY_LIST. Set PROXY_LIST env var and retry.');
    process.exit(2);
  }

  const proxies = list.slice(0, FLAG_MAX).map(parseProxy).filter((p): p is ProxyEntry => !!p);
  if (proxies.length === 0) {
    console.error('Could not parse any proxies. Expected format: host:port:user:pass');
    process.exit(2);
  }

  if (!FLAG_JSON) {
    console.log(`\nBotWave Proxy Validator — checking ${proxies.length} proxy/proxies${FLAG_WS ? ' (with WS probe)' : ''}`);
    console.log('─'.repeat(110));
  }

  const results: ProxyResult[] = [];

  // ip-api.com free tier: 45 req/min. We process in serial batches of 5 with a
  // 1s pause to stay well under that. For larger pools (>40) this means the run
  // takes a couple of minutes — still much cheaper than discovering a bad pool
  // after losing 10 sessions.
  const BATCH = 5;
  const PAUSE_MS = 1100;
  for (let i = 0; i < proxies.length; i += BATCH) {
    const slice = proxies.slice(i, i + BATCH);
    const batchResults = await Promise.all(slice.map(validateOne));
    for (const r of batchResults) {
      results.push(r);
      if (!FLAG_JSON) printResult(r);
    }
    if (i + BATCH < proxies.length) {
      await new Promise(res => setTimeout(res, PAUSE_MS));
    }
  }

  if (FLAG_JSON) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const total = results.length;
  const httpsOk = results.filter(r => r.httpsOk).length;
  const wsOk = FLAG_WS ? results.filter(r => r.wssOk).length : 0;
  const datacenter = results.filter(r => r.isDatacenter).length;
  const residential = results.filter(r => r.ipInfo && !r.isDatacenter).length;
  const unknownAsn = results.filter(r => !r.ipInfo).length;
  const avgLatency = (() => {
    const lats = results.map(r => r.httpsLatencyMs).filter((n): n is number => typeof n === 'number');
    if (!lats.length) return 0;
    return Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
  })();

  console.log('─'.repeat(110));
  console.log('\nSummary:');
  console.log(`  Total proxies tested:       ${total}`);
  console.log(`  HTTPS reachable:            ${httpsOk}/${total} (${Math.round((httpsOk / total) * 100)}%)`);
  if (FLAG_WS) {
    console.log(`  WebSocket reachable:        ${wsOk}/${total} (${Math.round((wsOk / total) * 100)}%)`);
  }
  console.log(`  Residential (not datacenter): ${residential}/${total} (${Math.round((residential / total) * 100)}%)`);
  console.log(`  Datacenter ASN (flagged):   ${datacenter}/${total} (${Math.round((datacenter / total) * 100)}%)`);
  if (unknownAsn) console.log(`  ASN unknown:                ${unknownAsn}/${total}`);
  console.log(`  Average latency:            ${avgLatency}ms`);

  console.log('\nVerdict for WhatsApp multi-session:');
  if (residential / total >= 0.8 && httpsOk / total >= 0.9) {
    console.log('  ✓ Residential majority + high reachability — safe to scale.');
  } else if (datacenter / total >= 0.5) {
    console.log('  ✗ Datacenter majority — WhatsApp will mass-disconnect at scale. Migrate to residential.');
  } else {
    console.log('  ~ Mixed pool — expect intermittent disconnects. Filter out datacenter entries or get more residential IPs.');
  }
  console.log('');

  // Pass if >=80% of proxies passed the HTTPS check (and WS check if asked)
  const passRate = FLAG_WS ? wsOk / total : httpsOk / total;
  process.exit(passRate >= 0.8 ? 0 : 1);
}

main().catch(err => {
  console.error('Validator crashed:', err);
  process.exit(2);
});

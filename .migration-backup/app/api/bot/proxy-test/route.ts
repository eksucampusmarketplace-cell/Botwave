import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import type { IncomingMessage } from 'node:http';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bot/proxy-test
 * Test a custom proxy by making a simple HTTPS request through it and
 * returning the exit IP it presents to the public internet.
 *
 * IMPORTANT: this route uses `https.request()` with `HttpsProxyAgent` rather
 * than Node's native `fetch()`. Native fetch silently IGNORES the `agent`
 * option — the request goes out directly from the server and returns the
 * server's own public IP, which means *any* proxy (including obviously bad
 * creds like `192.0.2.1:9999`) gets reported as "working". That false
 * positive was the original bug. By using https.request the agent is
 * actually honoured and bad proxies fail with a real error.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { host, port, username, password } = body;

    if (!host || !port) {
      return NextResponse.json(
        { error: 'Proxy host and port are required' },
        { status: 400 }
      );
    }

    const portNum = parseInt(String(port), 10);
    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
      return NextResponse.json(
        { error: `Invalid proxy port: ${port}` },
        { status: 400 }
      );
    }

    // Build proxy URL. We always use http:// scheme for the proxy itself —
    // this is the format BotWave's WhatsApp proxy pool uses (HTTP CONNECT
    // tunneling to https endpoints). SOCKS5 proxies are not currently
    // supported by this endpoint; if a user pastes SOCKS5 creds the request
    // will fail loudly with a connection error.
    const auth = username && password
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
      : '';
    const proxyUrl = `http://${auth}${host}:${portNum}`;

    let HttpsProxyAgent: any;
    try {
      HttpsProxyAgent = (await import('https-proxy-agent')).HttpsProxyAgent;
    } catch {
      return NextResponse.json(
        { error: 'Proxy testing not available on this server' },
        { status: 503 }
      );
    }

    const agent = new HttpsProxyAgent(proxyUrl, { timeout: 10_000 });

    const result = await requestThroughProxy('https://api.ipify.org?format=json', agent, 10_000);

    if (!result.ok) {
      // Surface the concrete failure so the user can tell bad creds from
      // network errors. e.g. "ECONNREFUSED", "407 Proxy Authentication
      // Required", "ETIMEDOUT".
      return NextResponse.json({
        success: false,
        error: `Proxy connection failed: ${result.error}`,
      });
    }

    // api.ipify.org returns {"ip": "x.x.x.x"} — fall back to httpbin shape
    // {"origin": "..."} if the response somehow comes from a different host.
    let detectedIp: string | undefined;
    try {
      const parsed = JSON.parse(result.body);
      detectedIp = parsed.ip || parsed.origin;
    } catch {
      detectedIp = undefined;
    }

    if (!detectedIp) {
      return NextResponse.json({
        success: false,
        error: `Proxy responded but the IP-check endpoint returned an unexpected body: ${result.body.slice(0, 200)}`,
      });
    }

    return NextResponse.json({
      success: true,
      ip: detectedIp,
      message: `Proxy is working. Your outgoing IP: ${detectedIp}`,
    });
  } catch (error) {
    console.error('[API] proxy-test error:', error);
    return NextResponse.json(
      { error: 'Failed to test proxy' },
      { status: 500 }
    );
  }
}

/**
 * Promisified https.request that respects the supplied proxy agent.
 * Returns either {ok:true, status, body} or {ok:false, error} so the caller
 * can decide how to present the result.
 */
function requestThroughProxy(
  url: string,
  agent: any,
  timeoutMs: number,
): Promise<{ ok: true; status: number; body: string } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (v: { ok: true; status: number; body: string } | { ok: false; error: string }) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };

    const req = https.request(
      url,
      { agent, method: 'GET', timeout: timeoutMs },
      (res: IncomingMessage) => {
        const status = res.statusCode || 0;
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (status >= 200 && status < 300) {
            settle({ ok: true, status, body });
          } else if (status === 407) {
            settle({ ok: false, error: '407 Proxy Authentication Required (check username/password)' });
          } else {
            settle({ ok: false, error: `Proxy/upstream returned HTTP ${status}: ${body.slice(0, 200)}` });
          }
        });
        res.on('error', (err) => {
          settle({ ok: false, error: err.message });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy();
      settle({ ok: false, error: `Proxy connection timed out after ${timeoutMs / 1000}s` });
    });

    req.on('error', (err: any) => {
      // Common signals: ECONNREFUSED (proxy down), ENOTFOUND (bad host),
      // ETIMEDOUT (slow network), ECONNRESET (proxy dropped us).
      const code = err.code ? `${err.code}: ` : '';
      settle({ ok: false, error: `${code}${err.message || 'Unknown error'}` });
    });

    req.end();
  });
}

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bot/proxy-test
 * Test a custom proxy by making a simple HTTP request through it.
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

    // Build proxy URL
    const auth = username && password ? `${username}:${password}@` : '';
    const proxyUrl = `http://${auth}${host}:${port}`;

    // Dynamically import https-proxy-agent
    let HttpsProxyAgent: any;
    try {
      HttpsProxyAgent = (await import('https-proxy-agent')).HttpsProxyAgent;
    } catch {
      return NextResponse.json(
        { error: 'Proxy testing not available on this server' },
        { status: 503 }
      );
    }

    const agent = new HttpsProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch('https://httpbin.org/ip', {
        agent,
        signal: controller.signal,
      } as any);
      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          error: `Proxy returned HTTP ${res.status}`,
        });
      }

      const data = await res.json();
      return NextResponse.json({
        success: true,
        ip: data.origin,
        message: `Proxy is working. Your outgoing IP: ${data.origin}`,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      const message = err.name === 'AbortError'
        ? 'Proxy connection timed out (10s)'
        : `Proxy connection failed: ${err.message || 'Unknown error'}`;
      return NextResponse.json({ success: false, error: message });
    }
  } catch (error) {
    console.error('[API] proxy-test error:', error);
    return NextResponse.json(
      { error: 'Failed to test proxy' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

const VALID_CONTAINERS = [
  'botwave_web',
  'botwave_whatsapp',
  'botwave_worker_1',
  'botwave_worker_2',
  'botwave_worker_3',
  'evolution_api',
  'evolution_postgres',
  'botwave_redis',
  'botwave_nginx',
  'portainer',
];

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const container = searchParams.get('container');
    const lines = Math.min(Math.max(1, parseInt(searchParams.get('lines') || '100', 10) || 100), 500);
    const since = searchParams.get('since') || '1h';

    if (!container || !VALID_CONTAINERS.includes(container)) {
      return NextResponse.json({
        error: `Invalid container. Valid: ${VALID_CONTAINERS.join(', ')}`,
      }, { status: 400 });
    }

    // Validate 'since' to prevent command injection (must be like "1h", "30m", "2024-01-01")
    if (!/^[\w.:-]+$/.test(since)) {
      return NextResponse.json({ error: 'Invalid since parameter' }, { status: 400 });
    }

    const raw = execSync(
      `docker logs --tail ${lines} --since ${since} ${container} 2>&1`,
      { encoding: 'utf-8', timeout: 10000, maxBuffer: 5 * 1024 * 1024 }
    );

    const logLines = raw.split('\n').map(line => {
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s*(.*)/);
      if (timestampMatch) {
        return { timestamp: timestampMatch[1], message: timestampMatch[2] };
      }
      return { timestamp: '', message: line };
    }).filter(l => l.message.trim());

    return NextResponse.json({
      success: true,
      data: {
        container,
        lines: logLines,
        count: logLines.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Logs GET error:', message);
    return NextResponse.json({ error: 'Failed to get logs' }, { status: 500 });
  }
}

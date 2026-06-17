import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = execSync(
      `docker exec botwave_whatsapp wget -qO- http://localhost:10000/api/scaling/status 2>/dev/null`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();

    if (!raw) {
      return NextResponse.json({ error: 'No response from bot' }, { status: 502 });
    }

    const data = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data: {
        mode: data.mode ?? 'standalone',
        activeWorkers: data.workerCount ?? 0,
        maxWorkers: parseInt(process.env.MAX_WORKER_THREADS || '40', 10),
        totalSessions: data.sessionCount ?? 0,
        scaleThreshold: parseInt(process.env.SCALE_THRESHOLD || '25', 10),
        syncCycleDurationMs: data.lastSyncCycleMs ?? 0,
        lastScaleEvent: data.lastScaleEvent ?? null,
        workerDetails: data.workerDetails ?? [],
      },
    });
  } catch (error) {
    console.error('[SCALING-STATUS] Error:', error);
    return NextResponse.json(
      { error: 'Auto-scaler status unavailable' },
      { status: 503 }
    );
  }
}

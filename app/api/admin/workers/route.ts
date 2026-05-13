import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

interface WorkerInfo {
  name: string;
  status: string;
  state: string;
  uptime: string;
  sessions: number;
}

interface ScalingConfig {
  currentWorkers: number;
  maxWorkers: number;
  sessionsPerWorker: number;
  recommendedWorkers: number;
  totalActiveSessions: number;
}

function getWorkerContainers(): WorkerInfo[] {
  try {
    const format = '{{.Names}}\t{{.Status}}\t{{.State}}';
    const raw = execSync(
      `docker ps -a --filter "name=botwave_worker" --format "${format}"`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();

    if (!raw) return [];

    return raw.split('\n').map(line => {
      const [name, status, state] = line.split('\t');
      return { name, status, state, uptime: status, sessions: 0 };
    }).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function countRunningWorkers(): number {
  const workers = getWorkerContainers();
  return workers.filter(w => w.state === 'running').length;
}

// GET: Worker status + scaling recommendation
export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workers = getWorkerContainers();
    const runningWorkers = workers.filter(w => w.state === 'running').length;

    // Get active session count from botwave_bot_main logs
    let totalActiveSessions = 0;
    try {
      const logLine = execSync(
        `docker logs botwave_bot_main --tail 50 2>&1 | grep -oP 'activeSessions=\\K\\d+' | tail -1`,
        { encoding: 'utf-8', timeout: 5000 }
      ).trim();
      if (logLine) totalActiveSessions = parseInt(logLine, 10) || 0;
    } catch { /* ignore */ }

    // If we couldn't get from logs, count from Supabase via the stats endpoint
    if (totalActiveSessions === 0) {
      try {
        const statsRaw = execSync(
          `docker exec botwave_bot_main sh -c 'wget -qO- http://localhost:10000/api/admin/stats 2>/dev/null || true'`,
          { encoding: 'utf-8', timeout: 10000 }
        ).trim();
        if (statsRaw) {
          const statsData = JSON.parse(statsRaw);
          totalActiveSessions = statsData?.data?.activeSessions || 0;
        }
      } catch { /* ignore */ }
    }

    const SESSIONS_PER_WORKER = 15;
    const MAX_WORKERS = 10;
    const recommendedWorkers = Math.max(1, Math.min(MAX_WORKERS, Math.ceil(totalActiveSessions / SESSIONS_PER_WORKER)));

    const scaling: ScalingConfig = {
      currentWorkers: runningWorkers,
      maxWorkers: MAX_WORKERS,
      sessionsPerWorker: SESSIONS_PER_WORKER,
      recommendedWorkers,
      totalActiveSessions,
    };

    return NextResponse.json({
      success: true,
      data: { workers, scaling },
    });
  } catch (error) {
    console.error('[WORKERS] Error:', error);
    return NextResponse.json({ error: 'Failed to get worker info' }, { status: 500 });
  }
}

// POST: Scale workers up/down
export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, targetCount } = body as { action: string; targetCount?: number };

    if (action === 'scale') {
      if (!targetCount || targetCount < 1 || targetCount > 10) {
        return NextResponse.json({ error: 'targetCount must be 1-10' }, { status: 400 });
      }

      const currentWorkers = countRunningWorkers();

      if (targetCount > currentWorkers) {
        // Scale UP — start stopped workers or create new ones
        const toStart: string[] = [];
        for (let i = currentWorkers + 1; i <= targetCount; i++) {
          toStart.push(`botwave-worker-${i}`);
        }
        if (toStart.length > 0) {
          try {
            // Workers 4+ use the 'scale' profile in docker-compose
            const profileFlag = toStart.some(w => parseInt(w.split('-')[2]) > 3) ? '--profile scale' : '';
            execSync(
              `cd /opt/botwave/deploy && docker compose ${profileFlag} up -d ${toStart.join(' ')} 2>&1`,
              { encoding: 'utf-8', timeout: 180000 }
            );
          } catch (composeErr) {
            console.error(`[WORKERS] Failed to scale up:`, composeErr);
            // Fallback: try starting individually
            for (const w of toStart) {
              try {
                execSync(`docker start ${w.replace(/-/g, '_')} 2>/dev/null || cd /opt/botwave/deploy && docker compose --profile scale up -d ${w} 2>&1`, {
                  encoding: 'utf-8', timeout: 120000,
                });
              } catch { /* ignore individual failures */ }
            }
          }
        }
      } else if (targetCount < currentWorkers) {
        // Scale DOWN — stop excess workers (highest numbers first)
        for (let i = currentWorkers; i > targetCount; i--) {
          try {
            execSync(`docker stop botwave_worker_${i}`, {
              encoding: 'utf-8', timeout: 30000,
            });
          } catch {
            console.error(`[WORKERS] Failed to stop botwave_worker_${i}`);
          }
        }
      }

      const newWorkers = getWorkerContainers();
      return NextResponse.json({
        success: true,
        data: {
          previousCount: currentWorkers,
          targetCount,
          workers: newWorkers,
        },
      });
    }

    if (action === 'restart') {
      const { workerName } = body as { workerName?: string };
      if (!workerName) {
        return NextResponse.json({ error: 'workerName required' }, { status: 400 });
      }

      try {
        execSync(`docker restart ${workerName}`, { encoding: 'utf-8', timeout: 60000 });
        return NextResponse.json({ success: true, data: { restarted: workerName } });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown';
        return NextResponse.json({ error: `Failed to restart: ${msg}` }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use "scale" or "restart"' }, { status: 400 });
  } catch (error) {
    console.error('[WORKERS] POST Error:', error);
    return NextResponse.json({ error: 'Failed to manage workers' }, { status: 500 });
  }
}

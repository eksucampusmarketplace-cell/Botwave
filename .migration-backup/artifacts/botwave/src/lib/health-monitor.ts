/**
 * Health Monitor - background service that periodically checks system health
 * and sends email alerts when issues are detected.
 *
 * Runs on the main service only (not workers). Checks every 60 seconds.
 */

import { sendAlertEmail, buildAlertHtml, isEmailConfigured } from './email-service';
import { onErrorSpike } from './error-tracker';
import { expireStuckPairingSessions, cleanupOldNeedsReauthSessions, cleanupGhostSessions } from '../bot/database';

const CHECK_INTERVAL_MS = 60_000; // 60 seconds
const GHOST_CLEANUP_INTERVAL_MS = 60 * 60_000; // once per hour
const REENGAGEMENT_TICK_INTERVAL_MS = 60 * 60_000; // hit the cron endpoint hourly; it decides if real work is due
let lastGhostCleanupAt = 0;
let lastReengagementTickAt = 0;
const CONSECUTIVE_FAILURES_THRESHOLD = 3;

let monitorInterval: ReturnType<typeof setInterval> | null = null;
let consecutiveFailures = 0;
let lastHealthStatus = 'unknown';
let isRunning = false;

interface HealthResponse {
  status: string;
  checks: Record<string, { status: string; latencyMs: number; details?: string }>;
  sessions: { total: number; active: number; needsReauth: number; stuck: number };
  system: { cpuPercent: number; memPercent: number };
}

async function checkHealth(): Promise<HealthResponse | null> {
  try {
    const selfUrl = process.env.SELF_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:10000';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${selfUrl}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json() as HealthResponse;
  } catch {
    return null;
  }
}

async function handleHealthResult(health: HealthResponse | null): Promise<void> {
  if (!isEmailConfigured()) return;

  // Health check itself failed
  if (!health) {
    consecutiveFailures++;
    if (consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
      await sendAlertEmail({
        subject: '🔴 BotWave Health Check UNREACHABLE',
        text: `Health endpoint has been unreachable for ${consecutiveFailures} consecutive checks (${consecutiveFailures} minutes).`,
        html: buildAlertHtml('Health Check Unreachable', 'critical', {
          'Consecutive Failures': consecutiveFailures,
          'Duration': `~${consecutiveFailures} minutes`,
          'Action': 'Check if botwave_web container is running',
        }),
      });
    }
    return;
  }

  // Transition from down/degraded to healthy
  if (lastHealthStatus !== 'healthy' && lastHealthStatus !== 'unknown' && health.status === 'healthy') {
    consecutiveFailures = 0;
    await sendAlertEmail({
      subject: '🟢 BotWave RECOVERED - All Systems Operational',
      text: `BotWave has recovered. All checks are passing.`,
      html: buildAlertHtml('System Recovered', 'info', {
        'Status': 'All systems operational',
        'Active Sessions': health.sessions?.active ?? 'N/A',
        'CPU': `${health.system?.cpuPercent ?? 'N/A'}%`,
        'Memory': `${health.system?.memPercent ?? 'N/A'}%`,
      }),
    });
  }

  // System is down
  if (health.status === 'down') {
    consecutiveFailures++;
    const downChecks = Object.entries(health.checks)
      .filter(([, v]) => v.status === 'down')
      .map(([k, v]) => `${k}: ${v.details || 'unreachable'}`)
      .join(', ');

    if (consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
      await sendAlertEmail({
        subject: '🔴 BotWave System DOWN',
        text: `Components down: ${downChecks}. Consecutive failures: ${consecutiveFailures}`,
        html: buildAlertHtml('System Down', 'critical', {
          'Down Components': downChecks,
          'Consecutive Failures': consecutiveFailures,
          'Active Sessions': health.sessions.active,
          'Stuck Sessions': health.sessions.stuck,
        }),
      });
    }
  } else {
    consecutiveFailures = 0;
  }

  // High CPU alert
  if (health.system?.cpuPercent != null && health.system.cpuPercent > 90) {
    await sendAlertEmail({
      subject: '⚠️ BotWave High CPU Usage',
      text: `CPU usage is at ${health.system.cpuPercent}%`,
      html: buildAlertHtml('High CPU Usage', 'warning', {
        'CPU Usage': `${health.system.cpuPercent}%`,
        'Memory Usage': `${health.system.memPercent}%`,
        'Active Sessions': health.sessions?.active ?? 'N/A',
      }),
    });
  }

  // High memory alert
  if (health.system?.memPercent != null && health.system.memPercent > 90) {
    await sendAlertEmail({
      subject: '⚠️ BotWave High Memory Usage',
      text: `Memory usage is at ${health.system.memPercent}%`,
      html: buildAlertHtml('High Memory Usage', 'warning', {
        'Memory Usage': `${health.system.memPercent}%`,
        'CPU Usage': `${health.system.cpuPercent}%`,
        'Active Sessions': health.sessions?.active ?? 'N/A',
      }),
    });
  }

  // Stuck sessions alert
  if (health.sessions?.stuck != null && health.sessions.stuck > 0) {
    await sendAlertEmail({
      subject: `⚠️ BotWave: ${health.sessions.stuck} Stuck Session(s)`,
      text: `${health.sessions.stuck} sessions appear stuck (no heartbeat for 3+ minutes)`,
      html: buildAlertHtml('Stuck Sessions Detected', 'warning', {
        'Stuck Sessions': health.sessions.stuck,
        'Active Sessions': health.sessions.active,
        'Needs Re-auth': health.sessions.needsReauth,
        'Total Sessions': health.sessions.total,
      }),
    });
  }

  lastHealthStatus = health.status;
}

export function startHealthMonitor(): void {
  if (isRunning) return;
  if (process.env.IS_WORKER === 'true') return;

  isRunning = true;
  console.log('[HEALTH-MONITOR] Starting background health monitor (60s interval)');

  // Register error spike callback
  onErrorSpike(async (snapshot) => {
    if (!isEmailConfigured()) return;
    const topFailing = snapshot.topFailingCommands
      .map(c => `!${c.command} (${c.failures}/${c.total} failed)`)
      .join(', ');

    await sendAlertEmail({
      subject: `🔴 BotWave Command Error Spike - ${(snapshot.failureRate * 100).toFixed(0)}% failure rate`,
      text: `${snapshot.failures}/${snapshot.totalCommands} commands failed in the last 5 minutes. Top failing: ${topFailing}`,
      html: buildAlertHtml('Command Error Spike', 'critical', {
        'Failure Rate': `${(snapshot.failureRate * 100).toFixed(1)}%`,
        'Failed Commands': `${snapshot.failures} / ${snapshot.totalCommands}`,
        'Avg Duration': `${snapshot.avgDurationMs}ms`,
        'Top Failing': topFailing || 'N/A',
      }),
    });
  });

  // Initial check after 30s (let services start up)
  setTimeout(async () => {
    const health = await checkHealth();
    await handleHealthResult(health);
  }, 30_000);

  // Regular interval checks + periodic session cleanup
  monitorInterval = setInterval(async () => {
    const health = await checkHealth();
    await handleHealthResult(health);

    // Run session cleanup every cycle (60s)
    try {
      const expired = await expireStuckPairingSessions();
      const cleaned = await cleanupOldNeedsReauthSessions();
      // Ghost cleanup is cheap but the rows churn slowly — once per hour
      // is plenty and keeps Supabase load minimal.
      const now = Date.now();
      let ghostsDeleted = 0;
      if (now - lastGhostCleanupAt >= GHOST_CLEANUP_INTERVAL_MS) {
        lastGhostCleanupAt = now;
        ghostsDeleted = await cleanupGhostSessions(24);
      }
      if (expired > 0 || cleaned > 0 || ghostsDeleted > 0) {
        console.log(`[HEALTH-MONITOR] Cleanup: ${expired} stuck pairing expired, ${cleaned} old needs_reauth deleted, ${ghostsDeleted} ghosts deleted`);
      }
    } catch (err) {
      console.error('[HEALTH-MONITOR] Session cleanup error:', err);
    }

    // Re-engagement sweep — hit the internal cron endpoint hourly. The
    // endpoint reads system_config.email_auto_send to decide if a sweep
    // is actually due, so calling it more often than needed is a no-op.
    try {
      const nowR = Date.now();
      if (nowR - lastReengagementTickAt >= REENGAGEMENT_TICK_INTERVAL_MS) {
        lastReengagementTickAt = nowR;
        const secret = process.env.INTERNAL_CRON_SECRET;
        const baseUrl = process.env.SELF_URL || process.env.NEXT_PUBLIC_APP_URL;
        if (secret && baseUrl) {
          const tickUrl = `${baseUrl.replace(/\/$/, '')}/api/internal/cron/reengagement-tick?secret=${encodeURIComponent(secret)}`;
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 30_000);
          fetch(tickUrl, { method: 'POST', signal: ctrl.signal })
            .then(async (res) => {
              clearTimeout(t);
              if (!res.ok) {
                console.warn(`[HEALTH-MONITOR] Re-engagement tick HTTP ${res.status}`);
                return;
              }
              const body = (await res.json().catch(() => ({}))) as { sent?: number; eligible?: number };
              if (body && (body.sent || body.eligible)) {
                console.log(`[HEALTH-MONITOR] Re-engagement tick: ${JSON.stringify(body)}`);
              }
            })
            .catch(() => { clearTimeout(t); /* network blip — ignore */ });
        }
      }
    } catch (err) {
      console.error('[HEALTH-MONITOR] Re-engagement tick error:', err);
    }
  }, CHECK_INTERVAL_MS);
}

export function stopHealthMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  isRunning = false;
  console.log('[HEALTH-MONITOR] Stopped');
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import os from 'os';
import { getErrorRateSnapshot, getRecentErrors } from '@/lib/error-tracker';
import { isEmailConfigured } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || (process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://evolution-api:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  details?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('bot_sessions').select('id', { count: 'exact', head: true });
    const latency = Date.now() - start;
    if (error) return { name: 'database', status: 'down', latencyMs: latency, details: error.message };
    return { name: 'database', status: latency > 2000 ? 'degraded' : 'healthy', latencyMs: latency };
  } catch (err: any) {
    return { name: 'database', status: 'down', latencyMs: Date.now() - start, details: err?.message };
  }
}

async function checkEvolutionApi(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: { apikey: EVOLUTION_API_KEY },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    if (!res.ok) return { name: 'evolution_api', status: 'degraded', latencyMs: latency, details: `status=${res.status}` };
    return { name: 'evolution_api', status: latency > 3000 ? 'degraded' : 'healthy', latencyMs: latency };
  } catch (err: any) {
    return { name: 'evolution_api', status: 'down', latencyMs: Date.now() - start, details: err?.message };
  }
}

async function checkWorkers(): Promise<HealthCheck[]> {
  const workerUrls = (process.env.WORKER_URLS || '').split(',').map(u => u.trim()).filter(Boolean);
  if (!workerUrls.length) return [];

  return Promise.all(workerUrls.map(async (url, i) => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${url}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
      const latency = Date.now() - start;
      if (!res.ok) return { name: `worker_${i + 1}`, status: 'down' as const, latencyMs: latency, details: `status=${res.status}` };
      return { name: `worker_${i + 1}`, status: latency > 3000 ? 'degraded' as const : 'healthy' as const, latencyMs: latency };
    } catch (err: any) {
      return { name: `worker_${i + 1}`, status: 'down' as const, latencyMs: Date.now() - start, details: err?.message };
    }
  }));
}

async function checkSessions(): Promise<{ total: number; active: number; needsReauth: number; stuck: number }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase.from('bot_sessions').select('state, heartbeat_at');
    if (!data) return { total: 0, active: 0, needsReauth: 0, stuck: 0 };

    const now = Date.now();
    const staleThreshold = 3 * 60 * 1000; // 3 minutes without heartbeat = stuck

    return {
      total: data.length,
      active: data.filter(s => s.state === 'active').length,
      needsReauth: data.filter(s => s.state === 'needs_reauth').length,
      stuck: data.filter(s =>
        s.state === 'active' &&
        s.heartbeat_at &&
        now - new Date(s.heartbeat_at).getTime() > staleThreshold
      ).length,
    };
  } catch {
    return { total: 0, active: 0, needsReauth: 0, stuck: 0 };
  }
}

export async function GET() {
  const startTime = Date.now();

  try {
    const [dbCheck, evoCheck, workerChecks, sessionStats] = await Promise.all([
      checkDatabase(),
      checkEvolutionApi(),
      checkWorkers(),
      checkSessions(),
    ]);

    const allChecks = [dbCheck, evoCheck, ...workerChecks];
    const hasDown = allChecks.some(c => c.status === 'down');
    const hasDegraded = allChecks.some(c => c.status === 'degraded');

    const overallStatus = hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy';

    // System resources
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg();
    const cpuPercent = Math.round((loadAvg[0] / cpuCount) * 100 * 10) / 10;
    const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10;

    // Error rate
    const errorRate = getErrorRateSnapshot();
    const recentErrors = getRecentErrors(5);

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      checks: Object.fromEntries(allChecks.map(c => [c.name, { status: c.status, latencyMs: c.latencyMs, details: c.details }])),
      sessions: sessionStats,
      system: {
        cpuPercent,
        cpuCount,
        memPercent,
        memUsedMb: Math.round((totalMem - freeMem) / (1024 * 1024)),
        memTotalMb: Math.round(totalMem / (1024 * 1024)),
        uptimeSeconds: Math.round(os.uptime()),
        loadAvg: loadAvg.map(l => Math.round(l * 100) / 100),
      },
      errorTracking: {
        window: `${errorRate.windowMs / 1000}s`,
        totalCommands: errorRate.totalCommands,
        failures: errorRate.failures,
        failureRate: `${(errorRate.failureRate * 100).toFixed(1)}%`,
        avgDurationMs: errorRate.avgDurationMs,
        topFailingCommands: errorRate.topFailingCommands,
        recentErrors: recentErrors.map(e => ({
          command: e.command,
          error: e.error,
          timestamp: new Date(e.timestamp).toISOString(),
        })),
      },
      alerting: {
        emailConfigured: isEmailConfigured(),
        smtpHost: process.env.SMTP_HOST || 'not configured',
      },
    };

    const httpStatus = overallStatus === 'down' ? 503 : overallStatus === 'degraded' ? 200 : 200;
    return NextResponse.json(response, { status: httpStatus });
  } catch (error: any) {
    return NextResponse.json({
      status: 'down',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      error: error?.message || 'Health check failed',
    }, { status: 503 });
  }
}

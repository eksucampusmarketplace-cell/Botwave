import { NextResponse } from 'next/server';
import { getCircuitStats } from '@/bot/circuitBreaker';
import { checkRedisHealth, isRedisAvailable } from '@/bot/redis';
import { getMemoryStats } from '@/bot/memoryGuard';
import { getWriteQueueStats } from '@/bot/writeQueue';
import { getAdaptiveStats } from '@/bot/adaptivePoller';
import { getAuthGuardStats } from '@/bot/authGuard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [redisHealth] = await Promise.all([
    checkRedisHealth(),
  ]);

  const circuit = getCircuitStats();
  const memory = getMemoryStats();
  const writeQueue = getWriteQueueStats();
  const adaptive = getAdaptiveStats();
  const authGuard = getAuthGuardStats();

  // Overall health: degraded if circuit is open or memory is high
  const isHealthy = circuit.state === 'CLOSED' && memory.rssMB < 450;
  const status = circuit.state === 'OPEN' ? 'degraded' : isHealthy ? 'healthy' : 'warning';

  return NextResponse.json({
    ok: isHealthy,
    status,
    timestamp: new Date().toISOString(),
    instance: process.env.SELF_URL || 'main',
    isWorker: process.env.IS_WORKER === 'true',
    uptime: Math.round(process.uptime()),
    memory,
    circuit,
    redis: {
      available: isRedisAvailable(),
      ...redisHealth,
    },
    writeQueue,
    adaptive,
    authGuard,
  });
}

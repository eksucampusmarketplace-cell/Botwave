import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return NextResponse.json({ success: true, data: { available: false, error: 'REDIS_URL not set' } });
    }

    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      const info = await redis.info();

      const parse = (section: string, key: string): string => {
        const regex = new RegExp(`^${key}:(.+)$`, 'm');
        const match = section.match(regex);
        return match ? match[1].trim() : '0';
      };

      // Memory
      const usedMemoryBytes = parseInt(parse(info, 'used_memory'), 10);
      const usedMemoryPeak = parseInt(parse(info, 'used_memory_peak'), 10);
      const maxMemory = parseInt(parse(info, 'maxmemory'), 10);
      const usedMemoryMb = Math.round(usedMemoryBytes / (1024 * 1024) * 10) / 10;
      const peakMemoryMb = Math.round(usedMemoryPeak / (1024 * 1024) * 10) / 10;
      const maxMemoryMb = maxMemory > 0 ? Math.round(maxMemory / (1024 * 1024) * 10) / 10 : null;
      const memoryPercent = maxMemory > 0 ? Math.round((usedMemoryBytes / maxMemory) * 1000) / 10 : null;
      const evictionPolicy = parse(info, 'maxmemory_policy');

      // Connections
      const connectedClients = parseInt(parse(info, 'connected_clients'), 10);
      const blockedClients = parseInt(parse(info, 'blocked_clients'), 10);
      const totalConnectionsReceived = parseInt(parse(info, 'total_connections_received'), 10);

      // Stats
      const totalCommandsProcessed = parseInt(parse(info, 'total_commands_processed'), 10);
      const opsPerSec = parseInt(parse(info, 'instantaneous_ops_per_sec'), 10);
      const hitRate = (() => {
        const hits = parseInt(parse(info, 'keyspace_hits'), 10);
        const misses = parseInt(parse(info, 'keyspace_misses'), 10);
        const total = hits + misses;
        return total > 0 ? Math.round((hits / total) * 1000) / 10 : null;
      })();
      const evictedKeys = parseInt(parse(info, 'evicted_keys'), 10);
      const expiredKeys = parseInt(parse(info, 'expired_keys'), 10);

      // Server
      const uptimeSeconds = parseInt(parse(info, 'uptime_in_seconds'), 10);
      const redisVersion = parse(info, 'redis_version');
      const role = parse(info, 'role');

      // Keyspace
      const dbSize = await redis.dbsize();
      const keysByPrefix: Record<string, number> = {};
      try {
        const prefixes = ['sess:', 'qr:', 'sstate:', 'hb:', 'lock:', 'ka:', 'pairing_lock:', 'session_welcome:'];
        for (const prefix of prefixes) {
          const keys = await redis.keys(`${prefix}*`);
          if (keys.length > 0) {
            keysByPrefix[prefix.replace(':', '')] = keys.length;
          }
        }
      } catch { /* ignore scan errors */ }

      await redis.disconnect();

      return NextResponse.json({
        success: true,
        data: {
          available: true,
          version: redisVersion,
          role,
          uptimeSeconds,
          memory: {
            usedMb: usedMemoryMb,
            peakMb: peakMemoryMb,
            maxMb: maxMemoryMb,
            percent: memoryPercent,
            evictionPolicy,
          },
          connections: {
            current: connectedClients,
            blocked: blockedClients,
            totalReceived: totalConnectionsReceived,
          },
          stats: {
            totalCommands: totalCommandsProcessed,
            opsPerSec,
            hitRatePercent: hitRate,
            evictedKeys,
            expiredKeys,
          },
          keyspace: {
            totalKeys: dbSize,
            byPrefix: keysByPrefix,
          },
        },
      });
    } catch (connErr: unknown) {
      const msg = connErr instanceof Error ? connErr.message : 'Unknown';
      try { redis.disconnect(); } catch { /* ignore */ }
      return NextResponse.json({
        success: true,
        data: { available: false, error: `Connection failed: ${msg}` },
      });
    }
  } catch (error) {
    console.error('[REDIS-ADMIN] Error:', error);
    return NextResponse.json({ error: 'Failed to get Redis info' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { execSync } from 'child_process';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const uptimeSeconds = os.uptime();

    let cpuPercent = (loadAvg[0] / cpuCount) * 100;
    try {
      const topOutput = execSync("top -bn1 | grep 'Cpu(s)' | head -1", {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      const idleMatch = topOutput.match(/(\d+\.?\d*)\s*id/);
      if (idleMatch) {
        cpuPercent = 100 - parseFloat(idleMatch[1]);
      }
    } catch {
      // fallback to load average estimate
    }

    let diskUsedGb = 0;
    let diskTotalGb = 0;
    try {
      const dfOutput = execSync("df -BG / | tail -1", { encoding: 'utf-8', timeout: 5000 }).trim();
      const parts = dfOutput.split(/\s+/);
      if (parts.length >= 4) {
        diskTotalGb = parseInt(parts[1]) || 0;
        diskUsedGb = parseInt(parts[2]) || 0;
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      data: {
        cpuPercent: Math.round(cpuPercent * 10) / 10,
        cpuCount,
        memUsedMb: Math.round(usedMem / (1024 * 1024)),
        memTotalMb: Math.round(totalMem / (1024 * 1024)),
        memPercent: Math.round((usedMem / totalMem) * 1000) / 10,
        uptimeSeconds: Math.round(uptimeSeconds),
        loadAvg,
        diskUsedGb,
        diskTotalGb,
      },
    });
  } catch (error) {
    console.error('[SYSTEM] Error:', error);
    return NextResponse.json({ error: 'Failed to get system info' }, { status: 500 });
  }
}

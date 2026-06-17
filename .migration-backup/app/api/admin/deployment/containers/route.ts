import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

interface ContainerInfo {
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
  service: 'botwave' | 'evolution' | 'infra';
}

function getServiceCategory(name: string): 'botwave' | 'evolution' | 'infra' {
  if (name.includes('evolution')) return 'evolution';
  if (name.includes('botwave') || name.includes('bot_main')) return 'botwave';
  return 'infra';
}

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const format = '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.State}}\t{{.Ports}}\t{{.CreatedAt}}';
    const raw = execSync(
      `docker ps -a --filter "network=botwave-net" --format "${format}"`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();

    const containers: ContainerInfo[] = [];

    if (raw) {
      for (const line of raw.split('\n')) {
        const parts = line.split('\t');
        if (parts.length < 6) continue;

        containers.push({
          name: parts[0],
          image: parts[1],
          status: parts[2],
          state: parts[3],
          ports: parts[4],
          created: parts[5],
          service: getServiceCategory(parts[0]),
        });
      }
    }

    const botwave = containers.filter(c => c.service === 'botwave');
    const evolution = containers.filter(c => c.service === 'evolution');
    const infra = containers.filter(c => c.service === 'infra');

    return NextResponse.json({
      success: true,
      data: { botwave, evolution, infra, all: containers },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Containers GET error:', message);
    return NextResponse.json({ error: 'Failed to get container status' }, { status: 500 });
  }
}

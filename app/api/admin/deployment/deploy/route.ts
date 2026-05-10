import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { exec } from 'child_process';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const DEPLOY_DIR = '/opt/botwave/deploy';
const HISTORY_FILE = '/opt/botwave/deploy/deploy-history.json';
const MAX_HISTORY = 50;

type DeployTarget = 'all' | 'botwave' | 'evolution';

const SERVICE_MAP: Record<string, string[]> = {
  botwave: ['botwave-web', 'botwave-bot', 'botwave-worker-1', 'botwave-worker-2', 'botwave-worker-3'],
  evolution: ['evolution-api'],
  all: [],
};

interface DeployRecord {
  id: string;
  timestamp: string;
  target: string;
  gitPull: boolean;
  success: boolean;
  duration: number;
  output: string;
}

function loadHistory(): DeployRecord[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return [];
}

function saveHistory(records: DeployRecord[]): void {
  const trimmed = records.slice(0, MAX_HISTORY);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
}

function buildDeployCommand(target: DeployTarget, gitPull: boolean): string {
  const commands: string[] = [];

  if (gitPull) {
    commands.push('cd /opt/botwave && git pull');
  }

  commands.push(`cd ${DEPLOY_DIR}`);
  commands.push('ln -sf .env.botwave .env');

  if (target === 'all') {
    commands.push('docker compose up -d --build');
  } else {
    const services = SERVICE_MAP[target];
    if (services && services.length > 0) {
      commands.push(`docker compose up -d --build ${services.join(' ')}`);
    }
  }

  return commands.join(' && ');
}

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = loadHistory();
    return NextResponse.json({ success: true, data: { history } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Deploy history error:', message);
    return NextResponse.json({ error: 'Failed to load deploy history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { target = 'all', gitPull = true } = body as {
      target?: DeployTarget;
      gitPull?: boolean;
    };

    if (!SERVICE_MAP[target] && target !== 'all') {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    const command = buildDeployCommand(target, gitPull);
    const startTime = Date.now();

    const deployPromise = new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      exec(command, {
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
      }, (error, stdout, stderr) => {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? 1 : 0,
        });
      });
    });

    const result = await deployPromise;
    const duration = Date.now() - startTime;
    const success = result.exitCode === 0;
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');

    const record: DeployRecord = {
      id: `deploy-${Date.now()}`,
      timestamp: new Date().toISOString(),
      target,
      gitPull,
      success,
      duration,
      output: output.slice(-3000),
    };

    const history = loadHistory();
    history.unshift(record);
    saveHistory(history);

    return NextResponse.json({
      success,
      message: success
        ? `Deployment of ${target} completed successfully`
        : `Deployment of ${target} failed`,
      data: {
        target,
        gitPull,
        output: output.slice(-5000),
        exitCode: result.exitCode,
        duration,
        recordId: record.id,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Deploy error:', message);
    return NextResponse.json({ error: 'Deployment failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEPLOY_DIR = '/opt/botwave/deploy';
const BACKUP_DIR = '/opt/botwave/deploy/backups';
const MAX_BACKUPS = 20;

const ENV_FILES: Record<string, string> = {
  botwave: '.env.botwave',
  evolution: '.env.evolution',
};

function parseEnvFile(content: string): Array<{ key: string; value: string; comment: boolean }> {
  const lines = content.split('\n');
  const entries: Array<{ key: string; value: string; comment: boolean }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#')) {
      entries.push({ key: trimmed, value: '', comment: true });
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1);

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries.push({ key, value, comment: false });
  }

  return entries;
}

function serializeEnvFile(entries: Array<{ key: string; value: string; comment: boolean }>): string {
  const lines: string[] = [];

  for (const entry of entries) {
    if (entry.comment) {
      lines.push(entry.key);
    } else {
      const needsQuotes = entry.value.includes(' ') ||
        entry.value.includes('\n') || entry.value.includes('#') ||
        entry.value.includes('\\n') || entry.value.includes('\t');
      const quotedValue = needsQuotes ? `"${entry.value}"` : entry.value;
      lines.push(`${entry.key}=${quotedValue}`);
    }
  }

  return lines.join('\n') + '\n';
}

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function createTimestampedBackup(service: string, filePath: string): string {
  ensureBackupDir();
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `${ENV_FILES[service]}.${ts}`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  pruneOldBackups(service);
  return backupName;
}

function pruneOldBackups(service: string): void {
  const prefix = ENV_FILES[service] + '.';
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(prefix))
    .sort()
    .reverse();

  for (let i = MAX_BACKUPS; i < files.length; i++) {
    fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
  }
}

function listBackups(service: string): Array<{ name: string; timestamp: string; size: number }> {
  ensureBackupDir();
  const prefix = ENV_FILES[service] + '.';
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(prefix))
    .sort()
    .reverse()
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      const tsStr = f.replace(prefix, '').replace(/-/g, (m, offset: number) => {
        if (offset === 4 || offset === 7) return '-';
        if (offset === 10) return 'T';
        if (offset === 13 || offset === 16) return ':';
        return m;
      });
      return {
        name: f,
        timestamp: tsStr,
        size: stat.size,
      };
    });
}

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const action = searchParams.get('action');

    if (!service || !ENV_FILES[service]) {
      return NextResponse.json({ error: 'Invalid service. Use "botwave" or "evolution"' }, { status: 400 });
    }

    if (action === 'backups') {
      const backups = listBackups(service);
      return NextResponse.json({ success: true, data: { service, backups } });
    }

    const filePath = path.join(DEPLOY_DIR, ENV_FILES[service]);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Config file not found: ${ENV_FILES[service]}` }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const entries = parseEnvFile(content);
    const vars = entries.filter(e => !e.comment);
    const sections = extractSections(content);
    const backups = listBackups(service);

    return NextResponse.json({
      success: true,
      data: { service, vars, sections, raw: content, backups },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Env vars GET error:', message);
    return NextResponse.json({ error: 'Failed to read env vars' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { service, vars, action, backupName } = body as {
      service: string;
      vars?: Array<{ key: string; value: string }>;
      action?: 'rollback';
      backupName?: string;
    };

    if (!service || !ENV_FILES[service]) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    const filePath = path.join(DEPLOY_DIR, ENV_FILES[service]);

    if (action === 'rollback' && backupName) {
      const backupPath = path.join(BACKUP_DIR, backupName);
      if (!fs.existsSync(backupPath)) {
        return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
      }

      createTimestampedBackup(service, filePath);
      fs.copyFileSync(backupPath, filePath);

      return NextResponse.json({
        success: true,
        message: `Rolled back ${service} to ${backupName}. Restart/redeploy to apply.`,
      });
    }

    if (!Array.isArray(vars)) {
      return NextResponse.json({ error: 'vars must be an array' }, { status: 400 });
    }

    const currentContent = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf-8')
      : '';

    createTimestampedBackup(service, filePath);

    const currentEntries = parseEnvFile(currentContent);
    const newVarMap = new Map(vars.map(v => [v.key, v.value]));
    const updatedEntries: Array<{ key: string; value: string; comment: boolean }> = [];
    const handledKeys = new Set<string>();

    for (const entry of currentEntries) {
      if (entry.comment) {
        updatedEntries.push(entry);
      } else if (newVarMap.has(entry.key)) {
        updatedEntries.push({ key: entry.key, value: newVarMap.get(entry.key)!, comment: false });
        handledKeys.add(entry.key);
      } else {
        updatedEntries.push(entry);
      }
    }

    for (const v of vars) {
      if (!handledKeys.has(v.key)) {
        updatedEntries.push({ key: v.key, value: v.value, comment: false });
      }
    }

    const newContent = serializeEnvFile(updatedEntries);
    fs.writeFileSync(filePath, newContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Updated ${service} env vars (backup saved). Restart/redeploy to apply changes.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Env vars PUT error:', message);
    return NextResponse.json({ error: 'Failed to update env vars' }, { status: 500 });
  }
}

function extractSections(content: string): string[] {
  const sections: string[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ──') || trimmed.startsWith('# ==')) {
      const sectionName = trimmed.replace(/^#\s*[─═]+\s*/, '').replace(/\s*[─═]+\s*$/, '').trim();
      if (sectionName) sections.push(sectionName);
    }
  }
  return sections;
}

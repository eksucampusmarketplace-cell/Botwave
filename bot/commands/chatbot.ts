import { registerCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, botStartTime, axios } from './helpers';
import { searchKnowledge } from './knowledgeBase';
import { isEvolutionHealthy } from '../evolutionClient';
import { WORKER_URLS, IS_WORKER, isWorkerHealthy } from '../workerConfig';
import { checkSupabaseHealth } from '../database';

// ─── !ask — Smart FAQ with fuzzy matching ───────────────────────────────────

async function handleAsk(
  context: MessageContext,
  args: string[],
  sock: any,
): Promise<void> {
  const query = args.join(' ').trim();
  if (!query) {
    await sendReply(
      context.chatJid,
      '*BotWave Smart FAQ*\n\n' +
      'Ask me anything about BotWave!\n\n' +
      'Usage: *!ask [your question]*\n\n' +
      'Examples:\n' +
      '• !ask how do I make stickers\n' +
      '• !ask what are the pricing plans\n' +
      '• !ask how to set up welcome messages\n' +
      '• !ask is my data safe',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const results = searchKnowledge(query);

  if (results.length === 0) {
    await sendReply(
      context.chatJid,
      `I couldn't find an answer for "${query}".\n\n` +
      'Try rephrasing your question, or use:\n' +
      '• *!help text* — Quick command list\n' +
      '• *!help* — Full guide (.docx)\n' +
      '• The support chat at www.botwave.online',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  // Best match
  const best = results[0];
  let reply = `*${best.question}*\n\n${best.answer}`;

  // If there are related results, show them as suggestions
  if (results.length > 1) {
    reply += '\n\n_Related:_';
    for (let i = 1; i < results.length; i++) {
      reply += `\n• _${results[i].question}_`;
    }
    reply += '\n\n_Ask again with one of those topics for more info!_';
  }

  await sendReply(context.chatJid, reply, sock, context.rawMessage.key, context.queue);
}

registerCommand({
  name: 'ask',
  aliases: ['ask', 'faq', 'support'],
  category: 'info',
  description: 'Smart FAQ — ask anything about BotWave',
  execute: async (context, args, sock) => {
    await handleAsk(context, args, sock);
  },
});

// ─── !diagnose — System health report ───────────────────────────────────────

function formatUptime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  if (days > 0) return `${days}d ${hrs % 24}h ${mins % 60}m`;
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m ${secs % 60}s`;
}

async function handleDiagnose(
  context: MessageContext,
  _args: string[],
  sock: any,
): Promise<void> {
  await sendReply(
    context.chatJid,
    'Running diagnostics...',
    sock,
    context.rawMessage.key,
    context.queue,
  );

  const uptime = Date.now() - botStartTime;
  const memUsage = process.memoryUsage();
  const memMB = Math.round(memUsage.rss / 1024 / 1024);

  // Evolution API health
  const evoHealthy = isEvolutionHealthy();
  const evoUrl = process.env.EVOLUTION_API_URL || 'not configured';
  let evoStatus = 'unknown';
  let evoLatency = 0;
  try {
    const start = Date.now();
    const res = await axios.get(`${evoUrl}/instance/fetchInstances`, {
      timeout: 10000,
      headers: { apikey: process.env.EVOLUTION_API_KEY || '' },
    });
    evoLatency = Date.now() - start;
    if (res.status === 200) {
      const instances = Array.isArray(res.data) ? res.data.length : 0;
      evoStatus = `online (${instances} instance${instances !== 1 ? 's' : ''}, ${evoLatency}ms)`;
    } else {
      evoStatus = `error (HTTP ${res.status}, ${evoLatency}ms)`;
    }
  } catch (err: any) {
    evoStatus = `unreachable (${err?.message || 'timeout'})`;
  }

  // Supabase health
  const supabaseHealth = await checkSupabaseHealth();
  const supabaseStatus = supabaseHealth.healthy
    ? `online (${supabaseHealth.latencyMs}ms)`
    : `DOWN — ${supabaseHealth.error || 'unknown error'} (${supabaseHealth.latencyMs}ms)`;

  // Worker health
  const workerResults: string[] = [];
  if (!IS_WORKER && WORKER_URLS.length > 0) {
    const checks = await Promise.all(
      WORKER_URLS.map(async (url) => {
        const healthy = await isWorkerHealthy(url);
        const name = url.replace(/https?:\/\//, '').split('.')[0];
        return `  ${healthy ? 'OK' : 'DOWN'} ${name}`;
      }),
    );
    workerResults.push(...checks);
  }

  const selfUrl = process.env.SELF_URL || 'unknown';
  const role = IS_WORKER ? 'Worker' : 'Main';
  const nodeVersion = process.version;

  let report = `*BOTWAVE SYSTEM DIAGNOSTICS*\n\n`;
  report += `*Bot Status*\n`;
  report += `  Role: ${role}\n`;
  report += `  URL: ${selfUrl}\n`;
  report += `  Uptime: ${formatUptime(uptime)}\n`;
  report += `  Memory: ${memMB} MB\n`;
  report += `  Node: ${nodeVersion}\n\n`;

  report += `*Supabase (Database)*\n`;
  report += `  Status: ${supabaseStatus}\n`;
  report += `  URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'not configured'}\n\n`;

  report += `*Evolution API*\n`;
  report += `  Health gate: ${evoHealthy ? 'HEALTHY' : 'DEGRADED'}\n`;
  report += `  Status: ${evoStatus}\n`;
  report += `  URL: ${evoUrl}\n\n`;

  if (workerResults.length > 0) {
    const healthyCount = workerResults.filter(r => r.includes('OK')).length;
    report += `*Workers (${healthyCount}/${WORKER_URLS.length} healthy)*\n`;
    report += workerResults.join('\n') + '\n\n';
  }

  report += `*Keepalive*\n`;
  report += `  Interval: 30s\n`;
  report += `  Mode: ${IS_WORKER ? 'self-only' : 'full sweep'}\n\n`;

  report += `_Report generated at ${new Date().toISOString()}_`;

  await sendReply(context.chatJid, report, sock, context.rawMessage.key, context.queue);
}

registerCommand({
  name: 'diagnose',
  aliases: ['diagnose', 'diag', 'health', 'sysinfo'],
  category: 'admin',
  description: 'System health report (owner only)',
  ownerOnly: true,
  execute: async (context, args, sock) => {
    await handleDiagnose(context, args, sock);
  },
});

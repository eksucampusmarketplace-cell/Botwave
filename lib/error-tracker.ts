/**
 * Error Rate Tracker - tracks command success/failure rates with spike detection.
 *
 * Maintains a sliding window of command executions and calculates failure rates.
 * Triggers alerts when failure rate exceeds configurable thresholds.
 */

interface CommandEvent {
  command: string;
  success: boolean;
  timestamp: number;
  durationMs: number;
  sessionId?: string;
  error?: string;
}

interface ErrorRateSnapshot {
  windowMs: number;
  totalCommands: number;
  failures: number;
  failureRate: number;
  avgDurationMs: number;
  topFailingCommands: { command: string; failures: number; total: number }[];
}

const WINDOW_MS = 5 * 60 * 1000; // 5-minute sliding window
const MAX_EVENTS = 10_000;
const ALERT_THRESHOLD = 0.20; // 20% failure rate triggers alert
const MIN_COMMANDS_FOR_ALERT = 10; // need at least 10 commands before alerting

const events: CommandEvent[] = [];
let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 10 * 60 * 1000; // don't alert more than once per 10 minutes

const alertCallbacks: ((snapshot: ErrorRateSnapshot) => void)[] = [];

function pruneOldEvents(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (events.length > 0 && events[0].timestamp < cutoff) {
    events.shift();
  }
  // Hard cap to prevent memory leak
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
}

export function trackCommandExecution(
  command: string,
  success: boolean,
  durationMs: number,
  sessionId?: string,
  error?: string,
): void {
  events.push({
    command,
    success,
    timestamp: Date.now(),
    durationMs,
    sessionId,
    error: error?.substring(0, 200),
  });

  pruneOldEvents();

  // Check for spike after every failure
  if (!success) {
    const snapshot = getErrorRateSnapshot();
    if (
      snapshot.totalCommands >= MIN_COMMANDS_FOR_ALERT &&
      snapshot.failureRate >= ALERT_THRESHOLD &&
      Date.now() - lastAlertAt > ALERT_COOLDOWN_MS
    ) {
      lastAlertAt = Date.now();
      for (const cb of alertCallbacks) {
        try { cb(snapshot); } catch { /* ignore callback errors */ }
      }
    }
  }
}

export function getErrorRateSnapshot(): ErrorRateSnapshot {
  pruneOldEvents();

  const total = events.length;
  const failures = events.filter(e => !e.success).length;
  const avgDuration = total > 0
    ? Math.round(events.reduce((sum, e) => sum + e.durationMs, 0) / total)
    : 0;

  // Group by command to find top failing
  const commandStats = new Map<string, { failures: number; total: number }>();
  for (const e of events) {
    const stats = commandStats.get(e.command) || { failures: 0, total: 0 };
    stats.total++;
    if (!e.success) stats.failures++;
    commandStats.set(e.command, stats);
  }

  const topFailing = [...commandStats.entries()]
    .filter(([, s]) => s.failures > 0)
    .sort((a, b) => b[1].failures - a[1].failures)
    .slice(0, 5)
    .map(([command, stats]) => ({ command, ...stats }));

  return {
    windowMs: WINDOW_MS,
    totalCommands: total,
    failures,
    failureRate: total > 0 ? Math.round((failures / total) * 1000) / 1000 : 0,
    avgDurationMs: avgDuration,
    topFailingCommands: topFailing,
  };
}

export function onErrorSpike(callback: (snapshot: ErrorRateSnapshot) => void): void {
  alertCallbacks.push(callback);
}

export function getRecentErrors(limit = 20): CommandEvent[] {
  pruneOldEvents();
  return events.filter(e => !e.success).slice(-limit);
}

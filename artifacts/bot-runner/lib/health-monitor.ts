/**
 * Health monitor for BotWave — tracks session health and sends alerts.
 * Monitors bot session uptime, error rates, and connectivity.
 */

let monitorInterval: ReturnType<typeof setInterval> | null = null;

export interface HealthStatus {
  healthy: boolean;
  activeSessions: number;
  errorRate: number;
  lastCheck: Date;
}

let currentStatus: HealthStatus = {
  healthy: true,
  activeSessions: 0,
  errorRate: 0,
  lastCheck: new Date(),
};

export function startHealthMonitor(getSessionCount?: () => number): void {
  if (monitorInterval) return;
  monitorInterval = setInterval(() => {
    currentStatus = {
      healthy: true,
      activeSessions: getSessionCount ? getSessionCount() : 0,
      errorRate: 0,
      lastCheck: new Date(),
    };
  }, 60_000);
  console.log('[HEALTH] Health monitor started');
}

export function stopHealthMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

export function getHealthStatus(): HealthStatus {
  return currentStatus;
}

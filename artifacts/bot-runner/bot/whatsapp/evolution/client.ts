/**
 * WhatsApp Evolution API client stubs.
 * Telegram-only deployment — all operations are no-ops.
 */

export interface PairingResult {
  success: boolean;
  qrCode?: string;
  pairingCode?: string;
  error?: string;
}

export async function waitForEvolutionReady(_maxAttempts = 15, _delayMs = 2000): Promise<boolean> { return false; }
export function resetEvolutionHealth(): void {}
export async function verifyEvolutionDataPersistence(): Promise<{ persisted: boolean; instanceCount: number }> { return { persisted: false, instanceCount: 0 }; }
export async function fetchAllEvolutionInstances(): Promise<Map<string, unknown>> { return new Map(); }
export async function verifyWebhookReachability(): Promise<boolean> { return false; }

export async function deleteInstanceAndVerify(_sessionId: string): Promise<void> {}
export async function reconnectInstance(_sessionId: string, _phone?: string): Promise<boolean> { return false; }

export function is428CooldownActive(): boolean { return false; }
export async function is428CooldownActiveAsync(): Promise<boolean> { return false; }
export function get428CooldownRemaining(): number { return 0; }
export function markEvolutionDown(): void {}
export function markEvolutionRecovered(): void {}
export function isEvolutionHealthy(): boolean { return false; }
export function trigger428Cooldown(_durationMsOrSource?: number | string): void {}
export function markPairingCodeGenerated(_sessionId: string): void {}
export function clearPairingStability(_sessionId: string): void {}
export function recordPairingAttempt(_sessionId: string): void {}
export function clearPairingAttempts(_sessionIdOrPhone: string): void {}
export function getReconnectDelay(_sessionId?: string): number { return 0; }
export function wasEvolutionRecentlyDown(): boolean { return false; }
export function setInstanceOwner(_sessionId: string, _owner: string): void {}
export function clearSessionProxy(_sessionId: string, _phoneNumber?: string): void {}

export async function createInstance(_sessionId: string, _phoneNumber?: string, _opts?: unknown): Promise<unknown> { return null; }
export async function deleteInstance(_sessionId: string): Promise<void> {}
export async function getPairingCode(_sessionId: string, _phone: string): Promise<PairingResult | null> { return null; }
export async function refreshPairingCode(_sessionId: string): Promise<string> { return ''; }
export async function getInstanceStatus(_sessionId: string): Promise<string> { return 'closed'; }
export async function setWebhook(_sessionId: string, _url?: string): Promise<void> {}
export function trackInstance(_sessionId: string): void {}
export function untrackInstance(_sessionId: string): void {}
export async function restartInstance(_sessionId: string): Promise<void> {}
export async function connectInstance(_sessionId: string): Promise<void> {}
export function recordProxyFailure(_sessionId: string, _proxyHost?: string, _reason?: string): void {}
export function recordProxySuccess(_sessionId: string, _proxyHost?: string): void {}
export function isProxyPoolDisabled(): boolean { return false; }
export function setKeepAliveDisconnectHandler(_fn: unknown): void {}
export function recordMessageActivity(_sessionId: string): void {}
export function getLastActivity(_sessionId: string): number { return 0; }
export function startEvolutionWebSocket(_sessionId?: string): void {}
export function stopEvolutionWebSocket(_sessionId?: string): void {}

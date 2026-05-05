// bot/evolutionClient.ts
// REST client for Evolution API endpoints.

const BASE = process.env.EVOLUTION_API_URL || '';
const KEY  = process.env.EVOLUTION_API_KEY  || '';
const REQUEST_TIMEOUT = 15_000;
const KEEPALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'apikey': KEY,
};

/**
 * Build the webhook URL that Evolution API should POST events to.
 * Falls back through available URL sources.
 */
function getWebhookUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SELF_URL ||
    '';
  return base ? `${base}/api/evolution/webhook` : '';
}

/**
 * Strip a data-URI prefix ("data:…;base64,") and return raw base64.
 * Evolution API validates with isBase64() which rejects data URIs.
 */
function stripDataUri(input: string): string {
  const idx = input.indexOf(';base64,');
  if (idx !== -1) return input.slice(idx + 8);
  return input;
}

/**
 * Wrapper around fetch with timeout and basic error checking.
 */
async function apiFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      // Clone before reading so the original body stays usable for callers
      const text = await res.clone().text().catch(() => '');
      console.error(`[EVO-CLIENT] ${options.method || 'GET'} ${url} -> ${res.status}: ${text.slice(0, 300)}`);
    }
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Retry a function up to `attempts` times with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelay = 1000): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// Create a new WhatsApp instance for a session, including webhook config.
// If the instance already exists (403), log and continue — the caller will
// connect to the existing instance via getPairingCode.
export async function createInstance(instanceName: string, phoneNumber: string) {
  const webhookUrl = getWebhookUrl();
  console.log(`[EVO-CLIENT] createInstance: name=${instanceName} phone=${phoneNumber} webhookUrl=${webhookUrl || 'NONE'}`);

  const payload: Record<string, unknown> = {
    instanceName,
    number: phoneNumber.replace(/\D/g, ''),
    qrcode: false,
    integration: 'WHATSAPP-BAILEYS',
  };

  // Configure per-instance webhook so Evolution API sends events to BotWave
  if (webhookUrl) {
    payload.webhook = {
      enabled: true,
      url: webhookUrl,
      byEvents: false,
      base64: false,
      events: [
        'CONNECTION_UPDATE',
        'MESSAGES_UPSERT',
        'QRCODE_UPDATED',
        'GROUP_PARTICIPANTS_UPDATE',
      ],
    };
  }

  const res = await withRetry(async () => {
    const r = await apiFetch(`${BASE}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // If instance name is already in use (stale after restart), delete and retry
    if (r.status === 403) {
      console.warn(`[EVO-CLIENT] Instance "${instanceName}" already exists — deleting stale instance and retrying`);
      await deleteInstance(instanceName);
      // Small delay for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      return apiFetch(`${BASE}/instance/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

    return r;
  });
  const result = await res.json();
  console.log(`[EVO-CLIENT] createInstance result for ${instanceName}: status=${res.status} instanceId=${(result as any)?.instance?.instanceId || 'none'}`);
  return result;
}

// Get pairing code for an instance (pass phone number as query param).
// Triggers Baileys connection if not yet started, then polls for the code
// since Baileys generates it asynchronously (~2-4s after connection starts).
export async function getPairingCode(instanceName: string, phoneNumber: string) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  console.log(`[EVO-CLIENT] getPairingCode: instance=${instanceName} phone=${cleanPhone}`);

  // First call triggers connectToWhatsapp inside Evolution API
  const connectRes = await withRetry(() =>
    apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
      method: 'GET',
      headers,
    }),
  );
  const connectData: any = await connectRes.json();
  console.log(`[EVO-CLIENT] getPairingCode initial response: status=${connectRes.status} pairingCode=${connectData?.pairingCode || 'none'} state=${connectData?.state || 'unknown'}`);
  if (connectData?.pairingCode) return connectData.pairingCode;

  // Baileys may still be connecting — poll up to 5 times (3s apart)
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
        method: 'GET',
        headers,
      });
      const data: any = await res.json();
      console.log(`[EVO-CLIENT] getPairingCode poll ${i + 1}/5: pairingCode=${data?.pairingCode || 'none'} state=${data?.state || 'unknown'}`);
      if (data?.pairingCode) return data.pairingCode;
    } catch (err) {
      console.warn(`[EVO-CLIENT] getPairingCode poll ${i + 1}/5 failed:`, err);
    }
  }
  console.warn(`[EVO-CLIENT] getPairingCode: no code returned after 5 polls for ${instanceName}`);
  return null;
}

// Fetch the latest pairing code without triggering a new connection.
// Safe to call repeatedly — returns current QR data when instance is connecting.
export async function refreshPairingCode(instanceName: string, phoneNumber: string): Promise<string | null> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const res = await apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
      method: 'GET',
      headers,
    });
    const data: any = await res.json();
    return data?.pairingCode || null;
  } catch {
    return null;
  }
}

// Get connection status of an instance
export async function getInstanceStatus(instanceName: string): Promise<string> {
  try {
    const res = await apiFetch(`${BASE}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers,
    });
    const data: any = await res.json();
    const state = data?.instance?.state || 'unknown';
    // Only log non-routine state changes (avoid flooding logs during polling)
    if (state !== 'open' && state !== 'connecting') {
      console.log(`[EVO-CLIENT] getInstanceStatus ${instanceName}: ${state}`);
    }
    return state;
  } catch (err) {
    console.warn(`[EVO-CLIENT] getInstanceStatus ${instanceName} failed:`, err);
    return 'unknown';
  }
}

// Restart an existing instance (reconnects without deleting auth state).
// Uses the Evolution API restart endpoint which closes the current WebSocket
// and re-establishes the connection using persisted auth credentials.
export async function restartInstance(instanceName: string): Promise<boolean> {
  console.log(`[EVO-CLIENT] restartInstance: ${instanceName}`);
  try {
    const res = await apiFetch(`${BASE}/instance/restart`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ instanceName }),
    });
    const ok = res.ok;
    console.log(`[EVO-CLIENT] restartInstance ${instanceName}: status=${res.status} ok=${ok}`);
    return ok;
  } catch (err) {
    console.warn(`[EVO-CLIENT] restartInstance ${instanceName} failed:`, err);
    return false;
  }
}

// Connect to an existing instance without requesting a new pairing code.
// This triggers Baileys to reconnect using saved auth credentials.
export async function connectInstance(instanceName: string): Promise<string> {
  console.log(`[EVO-CLIENT] connectInstance: ${instanceName}`);
  try {
    const res = await apiFetch(`${BASE}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers,
    });
    const data: any = await res.json();
    const state = data?.state || data?.instance?.state || 'unknown';
    console.log(`[EVO-CLIENT] connectInstance ${instanceName}: status=${res.status} state=${state}`);
    return state;
  } catch (err) {
    console.warn(`[EVO-CLIENT] connectInstance ${instanceName} failed:`, err);
    return 'unknown';
  }
}

// Delete an instance (used when session is removed)
export async function deleteInstance(instanceName: string) {
  console.log(`[EVO-CLIENT] deleteInstance: ${instanceName}`);
  try {
    const res = await apiFetch(`${BASE}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers,
    });
    console.log(`[EVO-CLIENT] deleteInstance ${instanceName}: status=${res.status}`);
  } catch (err) {
    console.warn(`[EVO-CLIENT] deleteInstance ${instanceName} failed (non-critical):`, err);
  }
}

// Configure webhook for an existing instance
export async function setWebhook(instanceName: string) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.warn(`[EVO-CLIENT] setWebhook skipped for ${instanceName}: no webhook URL configured`);
    return;
  }

  console.log(`[EVO-CLIENT] setWebhook for ${instanceName}: url=${webhookUrl}`);
  try {
    const res = await apiFetch(`${BASE}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: [
            'CONNECTION_UPDATE',
            'MESSAGES_UPSERT',
            'QRCODE_UPDATED',
            'GROUP_PARTICIPANTS_UPDATE',
          ],
        },
      }),
    });
    console.log(`[EVO-CLIENT] setWebhook ${instanceName}: status=${res.status}`);
  } catch (err) {
    console.error(`[EVO-CLIENT] Failed to set webhook for ${instanceName}:`, err);
  }
}

// Send a text message through an instance
export async function sendText(instanceName: string, to: string, text: string) {
  const res = await apiFetch(`${BASE}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: to, text, delay: 0 }),
  });
  return res.json();
}

// Send media (image, video, document) through an instance
export async function sendMedia(
  instanceName: string,
  to: string,
  mediaBase64: string,
  mimetype: string,
  mediatype: 'image' | 'video' | 'document',
  fileName?: string,
  caption?: string,
) {
  const res = await apiFetch(`${BASE}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      number: to,
      mediatype,
      mimetype,
      media: stripDataUri(mediaBase64),
      fileName: fileName || 'file',
      caption: caption || '',
      delay: 0,
    }),
  });
  return res.json();
}

// Send a sticker through an instance
export async function sendSticker(instanceName: string, to: string, stickerBase64: string) {
  const res = await apiFetch(`${BASE}/message/sendSticker/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: to, sticker: stripDataUri(stickerBase64), delay: 0 }),
  });
  return res.json();
}

// Send audio using the dedicated WhatsApp audio endpoint (encodes to opus)
export async function sendAudio(instanceName: string, to: string, audioBase64: string) {
  const res = await apiFetch(`${BASE}/message/sendWhatsAppAudio/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: to, audio: stripDataUri(audioBase64), delay: 0, encoding: true }),
  });
  return res.json();
}

// Mark messages as read
export async function markAsRead(instanceName: string, keys: Array<{ remoteJid: string; fromMe: boolean; id: string }>) {
  const res = await apiFetch(`${BASE}/chat/markMessageAsRead/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      readMessages: keys.map(k => ({
        remoteJid: k.remoteJid,
        fromMe: k.fromMe,
        id: k.id,
      })),
    }),
  });
  return res.json();
}

// Send presence update (composing, paused, available, unavailable)
export async function sendPresence(instanceName: string, jid: string, presence: string) {
  // Strip JID suffix — Evolution API expects plain number
  const number = jid.replace(/@s\.whatsapp\.net$|@g\.us$/g, '') || jid;
  const res = await apiFetch(`${BASE}/chat/sendPresence/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number, presence, delay: 0 }),
  });
  return res.json();
}

// Keep-alive: ping Evolution API to prevent instance auto-deletion
let keepAliveHandle: NodeJS.Timeout | null = null;
const trackedInstances = new Set<string>();

export function trackInstance(instanceName: string): void {
  trackedInstances.add(instanceName);
  ensureKeepAlive();
}

export function untrackInstance(instanceName: string): void {
  trackedInstances.delete(instanceName);
  if (trackedInstances.size === 0 && keepAliveHandle) {
    clearInterval(keepAliveHandle);
    keepAliveHandle = null;
  }
}

function ensureKeepAlive(): void {
  if (keepAliveHandle) return;
  console.log(`[EVO-CLIENT] Starting keep-alive loop for ${trackedInstances.size} instance(s), interval=${KEEPALIVE_INTERVAL / 1000}s`);
  keepAliveHandle = setInterval(async () => {
    for (const name of trackedInstances) {
      try {
        const res = await apiFetch(`${BASE}/instance/connectionState/${name}`, {
          method: 'GET',
          headers,
        });
        const data: any = await res.json();
        const state = data?.instance?.state || 'unknown';
        console.log(`[EVO-CLIENT] keep-alive ping ${name}: state=${state}`);
      } catch (err) {
        console.warn(`[EVO-CLIENT] keep-alive ping ${name} failed:`, err);
      }
    }
  }, KEEPALIVE_INTERVAL);
}

// Fetch instance info (includes user JID)
export async function fetchInstanceInfo(instanceName: string) {
  try {
    const res = await apiFetch(`${BASE}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET',
      headers,
    });
    const data: any = await res.json();
    const instance = Array.isArray(data) ? data[0] : data;
    console.log(`[EVO-CLIENT] fetchInstanceInfo ${instanceName}: found=${!!instance} state=${instance?.instance?.state || 'unknown'}`);
    return instance;
  } catch (err) {
    console.warn(`[EVO-CLIENT] fetchInstanceInfo ${instanceName} failed:`, err);
    return null;
  }
}

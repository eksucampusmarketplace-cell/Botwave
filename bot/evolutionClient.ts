// bot/evolutionClient.ts
// REST client for Evolution API endpoints.

const BASE = process.env.EVOLUTION_API_URL || '';
const KEY  = process.env.EVOLUTION_API_KEY  || '';
const REQUEST_TIMEOUT = 15_000;

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
 * Wrapper around fetch with timeout and basic error checking.
 */
async function apiFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
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

// Create a new WhatsApp instance for a session, including webhook config
export async function createInstance(instanceName: string, phoneNumber: string) {
  const webhookUrl = getWebhookUrl();

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

  const res = await withRetry(() =>
    apiFetch(`${BASE}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }),
  );
  return res.json();
}

// Get pairing code for an instance (pass phone number as query param)
export async function getPairingCode(instanceName: string, phoneNumber: string) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const res = await withRetry(() =>
    apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
      method: 'GET',
      headers,
    }),
  );
  const data: any = await res.json();
  return data?.pairingCode || null;
}

// Get connection status of an instance
export async function getInstanceStatus(instanceName: string): Promise<string> {
  try {
    const res = await apiFetch(`${BASE}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers,
    });
    const data: any = await res.json();
    return data?.instance?.state || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Delete an instance (used when session is removed)
export async function deleteInstance(instanceName: string) {
  try {
    await apiFetch(`${BASE}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers,
    });
  } catch {
    // non-critical — instance may not exist
  }
}

// Configure webhook for an existing instance
export async function setWebhook(instanceName: string) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return;

  try {
    await apiFetch(`${BASE}/webhook/set/${instanceName}`, {
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
  } catch (err) {
    console.error(`[EVO-CLIENT] Failed to set webhook for ${instanceName}:`, err);
  }
}

// Send a text message through an instance
export async function sendText(instanceName: string, to: string, text: string) {
  const res = await apiFetch(`${BASE}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: to, text }),
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
      media: mediaBase64,
      fileName: fileName || 'file',
      caption: caption || '',
    }),
  });
  return res.json();
}

// Send a sticker through an instance
export async function sendSticker(instanceName: string, to: string, stickerBase64: string) {
  const res = await apiFetch(`${BASE}/message/sendSticker/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: to, sticker: stickerBase64 }),
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
    body: JSON.stringify({ number, presence }),
  });
  return res.json();
}

// Fetch instance info (includes user JID)
export async function fetchInstanceInfo(instanceName: string) {
  try {
    const res = await apiFetch(`${BASE}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET',
      headers,
    });
    const data: any = await res.json();
    // Returns array — first element is the instance
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}

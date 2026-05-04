// bot/evolutionClient.ts
// REST client for Evolution API endpoints.

const BASE = process.env.EVOLUTION_API_URL || '';
const KEY  = process.env.EVOLUTION_API_KEY  || '';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'apikey': KEY,
};

// Create a new WhatsApp instance for a session
export async function createInstance(instanceName: string, phoneNumber: string) {
  const res = await fetch(`${BASE}/instance/create`, {
    method: 'POST', headers,
    body: JSON.stringify({
      instanceName,
      number: phoneNumber.replace(/\D/g, ''),
      qrcode: false,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });
  return res.json();
}

// Get pairing code for an instance (pass phone number as query param)
export async function getPairingCode(instanceName: string, phoneNumber: string) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const res = await fetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
    method: 'GET', headers,
  });
  const data: any = await res.json();
  return data?.pairingCode || null;
}

// Get connection status of an instance
export async function getInstanceStatus(instanceName: string): Promise<string> {
  try {
    const res = await fetch(`${BASE}/instance/connectionState/${instanceName}`, {
      method: 'GET', headers,
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
    await fetch(`${BASE}/instance/delete/${instanceName}`, {
      method: 'DELETE', headers,
    });
  } catch {
    // non-critical — instance may not exist
  }
}

// Send a text message through an instance
export async function sendText(instanceName: string, to: string, text: string) {
  const res = await fetch(`${BASE}/message/sendText/${instanceName}`, {
    method: 'POST', headers,
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
  const res = await fetch(`${BASE}/message/sendMedia/${instanceName}`, {
    method: 'POST', headers,
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
  const res = await fetch(`${BASE}/message/sendSticker/${instanceName}`, {
    method: 'POST', headers,
    body: JSON.stringify({ number: to, sticker: stickerBase64 }),
  });
  return res.json();
}

// Mark messages as read
export async function markAsRead(instanceName: string, keys: Array<{ remoteJid: string; fromMe: boolean; id: string }>) {
  const res = await fetch(`${BASE}/chat/markMessageAsRead/${instanceName}`, {
    method: 'POST', headers,
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
  const res = await fetch(`${BASE}/chat/sendPresence/${instanceName}`, {
    method: 'POST', headers,
    body: JSON.stringify({ number: jid, presence }),
  });
  return res.json();
}

// Fetch instance info (includes user JID)
export async function fetchInstanceInfo(instanceName: string) {
  try {
    const res = await fetch(`${BASE}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET', headers,
    });
    const data = await res.json();
    // Returns array — first element is the instance
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}

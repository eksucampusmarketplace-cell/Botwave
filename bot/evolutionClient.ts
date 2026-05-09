// bot/evolutionClient.ts
// REST client for Evolution API endpoints.

const BASE = process.env.EVOLUTION_API_URL || '';
const KEY  = process.env.EVOLUTION_API_KEY  || '';
const REQUEST_TIMEOUT = 15_000;
const KEEPALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes

// Proxy pool for distributing WebSocket connections across different IPs.
// Each proxy string is "host:port:user:pass".
const PROXY_LIST = (process.env.PROXY_LIST || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean);
let proxyCounter = 0;

// Log proxy pool status at startup so you can verify config in Render logs
if (PROXY_LIST.length > 0) {
  console.log(`[PROXY] Pool loaded: ${PROXY_LIST.length} proxies configured`);
  PROXY_LIST.forEach((p, i) => {
    const parts = p.split(':');
    console.log(`[PROXY]   #${i + 1}: ${parts[0]}:${parts[1]} (user: ${parts[2] || 'none'})`);
  });
} else {
  console.log('[PROXY] No PROXY_LIST configured — all connections will use server IP directly');
}

// Track consecutive Evolution API failures for health gating.
// Only counts failures from instance-creation and message-sending endpoints.
// Reconnection 404s (connectionState, delete) are expected after a restart
// and must NOT poison this counter.
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Check if the Evolution API endpoint is healthy enough to accept new
 * instance creation requests. Returns false if the last N requests all failed.
 */
export function isEvolutionHealthy(): boolean {
  return consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
}

/** Reset the failure counter. Called after any successful API response. */
export function resetEvolutionHealth(): void {
  consecutiveFailures = 0;
}

/**
 * Pick the next proxy from the pool in round-robin order.
 * Returns proxy config or null if no proxies configured.
 */
function getNextProxy(): { host: string; port: string; protocol: string; username: string; password: string } | null {
  if (PROXY_LIST.length === 0) return null;
  const proxy = PROXY_LIST[proxyCounter % PROXY_LIST.length];
  proxyCounter++;
  const parts = proxy.split(':');
  if (parts.length < 4) return null;
  return {
    host: parts[0],
    port: parts[1],
    protocol: 'http',
    username: parts[2],
    password: parts[3],
  };
}

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'apikey': KEY,
};

/**
 * Build the webhook URL that Evolution API should POST events to.
 * Prefers WEBHOOK_BASE_URL (internal Docker network) to avoid
 * routing through the public internet for container-to-container calls.
 */
function getWebhookUrl(): string {
  const base =
    process.env.WEBHOOK_BASE_URL ||
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
 * Safely parse a Response body as JSON. Returns null if the body is not valid
 * JSON (e.g. when Render returns an HTML 502/503 error page).
 */
async function safeJson(res: Response): Promise<any | null> {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Wrapper around fetch with timeout and basic error checking.
 */
async function apiFetch(url: string, options: RequestInit & { skipHealthCount?: boolean } = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const { skipHealthCount, ...fetchOptions } = options;
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
    if (!res.ok) {
      // Clone before reading so the original body stays usable for callers
      const text = await res.clone().text().catch(() => '');
      console.error(`[EVO-CLIENT] ${options.method || 'GET'} ${url} -> ${res.status}: ${text.slice(0, 300)}`);
      // Only count failures that indicate the API itself is broken (5xx, auth errors).
      // 404s during reconnection are expected — Evolution API may still be loading.
      if (!skipHealthCount && res.status >= 500) {
        consecutiveFailures++;
      }
    } else {
      consecutiveFailures = 0;
    }
    return res;
  } catch (err) {
    // Network errors always count — the API is unreachable
    consecutiveFailures++;
    throw err;
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

/**
 * Wait for Evolution API to become reachable before starting session sync.
 * Polls the fetchInstances endpoint (lightweight, no side effects) with
 * increasing delays. Returns true if the API responded, false if all
 * attempts were exhausted.
 */
export async function waitForEvolutionReady(maxAttempts = 10, baseDelayMs = 3000): Promise<boolean> {
  if (!BASE) return false;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const res = await fetch(`${BASE}/instance/fetchInstances`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        console.log(`[EVO-CLIENT] Evolution API ready (attempt ${i}/${maxAttempts})`);
        consecutiveFailures = 0;
        return true;
      }
      console.warn(`[EVO-CLIENT] Evolution API not ready: status=${res.status} (attempt ${i}/${maxAttempts})`);
    } catch (err: any) {
      console.warn(`[EVO-CLIENT] Evolution API unreachable: ${err.message} (attempt ${i}/${maxAttempts})`);
    }
    if (i < maxAttempts) {
      const delay = Math.min(baseDelayMs * i, 15000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error(`[EVO-CLIENT] Evolution API did not become ready after ${maxAttempts} attempts`);
  return false;
}

// Create a new WhatsApp instance for a session, including webhook config.
// If the instance already exists (403), log and continue — the caller will
// connect to the existing instance via getPairingCode.
export async function createInstance(instanceName: string, phoneNumber: string) {
  // Guard: refuse to create new instances if Evolution API has been failing
  if (!isEvolutionHealthy()) {
    console.error(`[EVO-CLIENT] createInstance BLOCKED: Evolution API has ${consecutiveFailures} consecutive failures — refusing to accept new pairing sessions`);
    throw new Error('Evolution API is unhealthy — cannot create new instances');
  }

  const webhookUrl = getWebhookUrl();
  console.log(`[EVO-CLIENT] createInstance: name=${instanceName} phone=${phoneNumber} webhookUrl=${webhookUrl || 'NONE'}`);

  const payload: Record<string, unknown> = {
    instanceName,
    number: phoneNumber.replace(/\D/g, ''),
    qrcode: false,
    integration: 'WHATSAPP-BAILEYS',
  };

  // Pick a proxy for this instance (applied after creation via separate API call).
  const proxyIndex = proxyCounter;
  const proxy = getNextProxy();
  if (proxy) {
    console.log(`[PROXY] Will assign proxy #${(proxyIndex % PROXY_LIST.length) + 1}/${PROXY_LIST.length} to instance ${instanceName}: ${proxy.host}:${proxy.port} (user: ${proxy.username}, protocol: ${proxy.protocol})`);
  } else {
    console.warn(`[PROXY] No proxy available for instance ${instanceName} — connecting with server IP (risk of 428 ban)`);
  }

  // NOTE: Do NOT include proxy or webhook config in the create payload.
  // Evolution API v2.3.7 has a race condition where setProxy is called on
  // waInstances[name] before the instance is fully registered, causing
  // "Cannot read properties of undefined (reading 'setProxy')" errors.
  // Instead, set proxy separately after creation succeeds.

  const res = await withRetry(async () => {
    const r = await apiFetch(`${BASE}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // 502/503 = Render's reverse proxy couldn't reach the upstream.
    // Throw so withRetry retries after a backoff instead of crashing
    // when we try to parse the HTML error page as JSON.
    if (r.status === 502 || r.status === 503) {
      throw new Error(`Evolution API returned ${r.status} (transient) — will retry`);
    }

    // If instance name is already in use, delete via API and retry once.
    // The server-side guard now auto-cleans stale instances, so 403 should
    // be rare — but we keep this as a safety net for edge cases (e.g. the
    // guard cleanup itself fails, or a P2002 unique-constraint race on DB).
    if (r.status === 403 || r.status === 400) {
      const body = await r.clone().text().catch(() => '');
      const isDuplicate = r.status === 403 || body.includes('Unique constraint');
      if (isDuplicate) {
        console.warn(`[EVO-CLIENT] Instance "${instanceName}" already exists (status=${r.status}) — deleting and retrying`);
        await deleteInstanceAndVerify(instanceName);
        // Extra pause after verified deletion to let DB constraints fully propagate
        await new Promise(resolve => setTimeout(resolve, 2000));
        return apiFetch(`${BASE}/instance/create`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }
    }

    return r;
  }, 4, 2000); // 4 attempts, 2s base delay for 502/503 recovery
  const result = await safeJson(res);
  if (!result) {
    console.error(`[EVO-CLIENT] createInstance: response body is not valid JSON (status=${res.status}) — treating as failure`);
    return { error: true, status: res.status, message: 'Non-JSON response from Evolution API' };
  }
  const instanceId = result?.instance?.instanceId || 'none';
  console.log(`[EVO-CLIENT] createInstance result for ${instanceName}: status=${res.status} instanceId=${instanceId}`);

  // Set proxy via separate API call after instance is fully created.
  // This avoids the race condition where setProxy is called before the
  // instance is registered in waInstances.
  if (proxy && (res.status === 200 || res.status === 201)) {
    // Small delay to let Evolution API fully register the instance
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const proxyRes = await apiFetch(`${BASE}/proxy/set/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          enabled: true,
          host: proxy.host,
          port: proxy.port,
          protocol: proxy.protocol,
          username: proxy.username,
          password: proxy.password,
        }),
      });
      if (proxyRes.status === 200 || proxyRes.status === 201) {
        console.log(`[PROXY] Proxy SET for ${instanceName} — ${proxy.host}:${proxy.port}`);
      } else {
        const body = await proxyRes.text().catch(() => '');
        console.warn(`[PROXY] Failed to set proxy for ${instanceName} (status=${proxyRes.status}): ${body.slice(0, 200)}`);
      }
    } catch (err) {
      console.warn(`[PROXY] setProxy call failed for ${instanceName} (non-fatal):`, err);
    }
  }

  // Set per-instance webhook separately (non-fatal — global webhook is the fallback)
  if (webhookUrl && (res.status === 200 || res.status === 201)) {
    setWebhook(instanceName).catch(err => {
      console.warn(`[EVO-CLIENT] setWebhook after create failed for ${instanceName} (non-fatal, global webhook active):`, err);
    });
  }

  return result;
}

// Get pairing code for an instance (pass phone number as query param).
// Triggers Baileys connection if not yet started, then polls for the code
// since Baileys generates it asynchronously (~2-4s after connection starts).
export async function getPairingCode(instanceName: string, phoneNumber: string) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const flowStart = Date.now();
  console.log(`[PAIRING-EVO-CLIENT] ======= getPairingCode START ======= instance=${instanceName} phone=${cleanPhone} at=${new Date(flowStart).toISOString()}`);

  // First call triggers connectToWhatsapp inside Evolution API.
  // Baileys needs time to establish the WebSocket, generate identity keys,
  // and produce a pairing code. Give it an initial 5s window before the
  // first poll to avoid hitting the connect endpoint while Baileys is
  // still initialising (which returns {count:0} with no pairing code).
  const connectStart = Date.now();
  const connectRes = await withRetry(() =>
    apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
      method: 'GET',
      headers,
    }).then(r => {
      if (r.status === 502 || r.status === 503) {
        throw new Error(`Evolution API returned ${r.status} (transient) — will retry`);
      }
      return r;
    }),
  );
  const connectData: any = await safeJson(connectRes);
  const connectDuration = Date.now() - connectStart;
  console.log(`[PAIRING-EVO-CLIENT] Initial connect response: status=${connectRes.status} pairingCode=${connectData?.pairingCode || 'none'} state=${connectData?.state || 'unknown'} duration=${connectDuration}ms`);
  console.log(`[PAIRING-EVO-CLIENT] Full response data: ${JSON.stringify(connectData).slice(0, 500)}`);
  if (connectData?.pairingCode) {
    console.log(`[PAIRING-EVO-CLIENT] Got code on first try: "${connectData.pairingCode}" totalDuration=${Date.now() - flowStart}ms`);
    return connectData.pairingCode;
  }

  // Baileys may still be connecting — poll up to 8 times (4s apart).
  // The initial 5s wait lets Baileys establish its WebSocket before we
  // start hammering the connect endpoint. Total budget: ~37s.
  const POLL_ATTEMPTS = 8;
  const POLL_INTERVAL_MS = 4000;
  const INITIAL_WAIT_MS = 5000;
  console.log(`[PAIRING-EVO-CLIENT] No code on first try, waiting ${INITIAL_WAIT_MS}ms then polling (${POLL_ATTEMPTS} attempts, ${POLL_INTERVAL_MS}ms apart)...`);
  await new Promise(r => setTimeout(r, INITIAL_WAIT_MS));

  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    const pollStart = Date.now();
    const elapsed = pollStart - flowStart;
    try {
      const res = await apiFetch(`${BASE}/instance/connect/${instanceName}?number=${cleanPhone}`, {
        method: 'GET',
        headers,
      });
      if (res.status === 502 || res.status === 503) {
        console.warn(`[PAIRING-EVO-CLIENT] Poll ${i + 1}/${POLL_ATTEMPTS}: got ${res.status} (transient) — skipping`);
        continue;
      }
      const data: any = await safeJson(res);
      if (!data) {
        console.warn(`[PAIRING-EVO-CLIENT] Poll ${i + 1}/${POLL_ATTEMPTS}: non-JSON response — skipping`);
        continue;
      }
      const pollDuration = Date.now() - pollStart;
      const hasQrCount = typeof data?.count === 'number';
      console.log(`[PAIRING-EVO-CLIENT] Poll ${i + 1}/${POLL_ATTEMPTS}: status=${res.status} pairingCode=${data?.pairingCode || 'none'} state=${data?.state || 'unknown'} qrCount=${hasQrCount ? data.count : 'n/a'} pollDuration=${pollDuration}ms totalElapsed=${elapsed}ms`);
      if (data?.pairingCode) {
        console.log(`[PAIRING-EVO-CLIENT] Got code on poll ${i + 1}: "${data.pairingCode}" totalDuration=${Date.now() - flowStart}ms`);
        return data.pairingCode;
      }
    } catch (err: any) {
      console.error(`[PAIRING-EVO-CLIENT] Poll ${i + 1}/${POLL_ATTEMPTS} FAILED: error=${err?.message} totalElapsed=${elapsed}ms`);
    }
    if (i < POLL_ATTEMPTS - 1) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
  const totalDuration = Date.now() - flowStart;
  console.error(`[PAIRING-EVO-CLIENT] ======= getPairingCode FAILED ======= No code after ${POLL_ATTEMPTS} polls for ${instanceName}. totalDuration=${totalDuration}ms`);
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
    if (res.status === 502 || res.status === 503) return null;
    const data: any = await safeJson(res);
    return data?.pairingCode || null;
  } catch {
    return null;
  }
}

// Get connection status of an instance.
// 404s are expected during reconnection (Evolution API still loading) — don't count them as failures.
export async function getInstanceStatus(instanceName: string): Promise<string> {
  try {
    const res = await apiFetch(`${BASE}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers,
      skipHealthCount: true,
    });
    if (res.status === 502 || res.status === 503) return 'unknown';
    const data: any = await safeJson(res);
    if (!data) return 'unknown';
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
export async function connectInstance(instanceName: string, phoneNumber?: string): Promise<string> {
  console.log(`[EVO-CLIENT] connectInstance: ${instanceName} phone=${phoneNumber || 'none'}`);
  try {
    let url = `${BASE}/instance/connect/${instanceName}`;
    if (phoneNumber) {
      url += `?number=${phoneNumber.replace(/\D/g, '')}`;
    }
    const res = await apiFetch(url, {
      method: 'GET',
      headers,
    });
    if (res.status === 502 || res.status === 503) return 'unknown';
    const data: any = await safeJson(res);
    if (!data) return 'unknown';
    const state = data?.state || data?.instance?.state || 'unknown';
    console.log(`[EVO-CLIENT] connectInstance ${instanceName}: status=${res.status} state=${state}`);
    return state;
  } catch (err) {
    console.warn(`[EVO-CLIENT] connectInstance ${instanceName} failed:`, err);
    return 'unknown';
  }
}

// Delete an instance (used when session is removed).
// 404s are expected (instance already gone) — don't count them as failures.
export async function deleteInstance(instanceName: string) {
  console.log(`[EVO-CLIENT] deleteInstance: ${instanceName}`);
  try {
    const res = await apiFetch(`${BASE}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers,
      skipHealthCount: true,
    });
    console.log(`[EVO-CLIENT] deleteInstance ${instanceName}: status=${res.status}`);
  } catch (err) {
    console.warn(`[EVO-CLIENT] deleteInstance ${instanceName} failed (non-critical):`, err);
  }
}

/**
 * Delete an instance and poll until Evolution API confirms it is fully gone.
 * Evolution API's delete endpoint returns 200 immediately but cleanup is
 * async (event-driven). Without verification, a subsequent createInstance
 * races against the cleanup and gets 403 "name already in use".
 *
 * If the instance persists after the first delete + polling cycle, we retry
 * the delete up to {@link MAX_DELETE_RETRIES} times. This handles cases where
 * the first delete's DB cleanup fails (e.g. P2028 transaction timeout) and
 * the instance record remains in the database.
 */
export async function deleteInstanceAndVerify(instanceName: string, maxWaitMs = 15_000): Promise<void> {
  const MAX_DELETE_RETRIES = 3;
  const POLL_INTERVAL = 2000;

  for (let attempt = 1; attempt <= MAX_DELETE_RETRIES; attempt++) {
    await deleteInstance(instanceName);

    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const state = await getInstanceStatus(instanceName);
      if (state === 'unknown') {
        console.log(`[EVO-CLIENT] deleteInstanceAndVerify: ${instanceName} confirmed gone after ${Date.now() - start}ms (attempt ${attempt})`);
        return;
      }
      console.log(`[EVO-CLIENT] deleteInstanceAndVerify: ${instanceName} still exists (state=${state}), waiting... (attempt ${attempt})`);
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }

    if (attempt < MAX_DELETE_RETRIES) {
      console.warn(`[EVO-CLIENT] deleteInstanceAndVerify: ${instanceName} still present after ${maxWaitMs}ms — retrying delete (attempt ${attempt + 1}/${MAX_DELETE_RETRIES})`);
    }
  }
  console.warn(`[EVO-CLIENT] deleteInstanceAndVerify: ${instanceName} still present after ${MAX_DELETE_RETRIES} delete attempts — proceeding anyway`);
}

// Configure webhook for an existing instance.
// Retries with backoff to handle FK constraint errors that occur when the
// instance record hasn't fully propagated to the database yet.
export async function setWebhook(instanceName: string) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.warn(`[EVO-CLIENT] setWebhook skipped for ${instanceName}: no webhook URL configured`);
    return;
  }

  console.log(`[EVO-CLIENT] setWebhook for ${instanceName}: url=${webhookUrl}`);
  const MAX_RETRIES = 3;
  const BASE_DELAY = 2000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
            // Empty events array = subscribe to ALL events.
            // Previously used specific event names (MESSAGES_UPSERT, etc.)
            // but Evolution API v2.3.7 may not recognize those constants,
            // causing messages.upsert to never be forwarded.
            events: [],
          },
        }),
      });
      console.log(`[EVO-CLIENT] setWebhook ${instanceName}: status=${res.status} (attempt ${attempt})`);
      if (res.ok) return;
      const body = await res.text().catch(() => '');
      const isConstraintError = body.includes('foreign key') || body.includes('P2003') || body.includes('P2025');
      if (!isConstraintError || attempt === MAX_RETRIES) {
        console.error(`[EVO-CLIENT] setWebhook ${instanceName} failed: status=${res.status} body=${body}`);
        return;
      }
      console.warn(`[EVO-CLIENT] setWebhook ${instanceName} FK constraint error (attempt ${attempt}/${MAX_RETRIES}) — retrying in ${BASE_DELAY * attempt}ms`);
      await new Promise(r => setTimeout(r, BASE_DELAY * attempt));
    } catch (err) {
      console.error(`[EVO-CLIENT] Failed to set webhook for ${instanceName} (attempt ${attempt}/${MAX_RETRIES}):`, err);
      if (attempt === MAX_RETRIES) return;
      await new Promise(r => setTimeout(r, BASE_DELAY * attempt));
    }
  }
}

// Send a text message through an instance
export async function sendText(instanceName: string, to: string, text: string, mentioned?: string[]) {
  const payload: Record<string, unknown> = { number: to, text, delay: 0 };
  if (mentioned && mentioned.length > 0) {
    payload.mentioned = mentioned;
  }
  const res = await apiFetch(`${BASE}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
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

// Post a status (story) through an instance
export async function sendStatus(
  instanceName: string,
  type: 'text' | 'image' | 'video' | 'audio',
  contentBase64OrUrl: string,
  options?: {
    caption?: string;
    statusJidList?: string[];
    allContacts?: boolean;
    backgroundColor?: string;
    font?: number;
  },
) {
  const payload: Record<string, unknown> = {
    type,
    content: type === 'text' ? contentBase64OrUrl : stripDataUri(contentBase64OrUrl),
    ...(options?.caption ? { caption: options.caption } : {}),
    ...(options?.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
    ...(options?.font !== undefined ? { font: options.font } : {}),
  };

  if (options?.statusJidList?.length) {
    payload.statusJidList = options.statusJidList;
  } else {
    payload.allContacts = true;
  }

  const res = await apiFetch(`${BASE}/message/sendStatus/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
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

// Edit (update) an existing text message.
// Throws on non-2xx so callers' catch blocks can fall back to normal send.
// Handles LID/phone JID mismatch: if the first attempt fails because the
// stored message uses LID addressing, we look up the stored key and retry.
export async function updateMessage(
  instanceName: string,
  key: { remoteJid: string; fromMe: boolean; id: string },
  text: string,
) {
  const isGroup = key.remoteJid.endsWith('@g.us');
  const isLid = key.remoteJid.endsWith('@lid');
  const number = key.remoteJid.replace(/@s\.whatsapp\.net$|@g\.us$|@lid$/g, '');
  console.log(`[EDIT-DEBUG] updateMessage: remoteJid=${key.remoteJid} fromMe=${key.fromMe} id=${key.id} isGroup=${isGroup} isLid=${isLid} number=${number}`);

  const res = await apiFetch(`${BASE}/chat/updateMessage/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number, key, text }),
  });
  if (res.ok) {
    console.log(`[EDIT-DEBUG] updateMessage SUCCESS on first attempt`);
    return res.json();
  }

  const body = await res.text();
  console.log(`[EDIT-DEBUG] updateMessage FAILED (${res.status}): ${body.slice(0, 300)}`);

  // If "RemoteJid does not match", the DB likely stores the message with a
  // different JID format. Look up the stored key and retry with its remoteJid.
  if (body.includes('RemoteJid does not match')) {
    try {
      const stored = await findMessageByKeyId(instanceName, key.id);
      console.log(`[EDIT-DEBUG] DB lookup: stored key=${JSON.stringify(stored?.key)}`);
      if (stored?.key?.remoteJid && stored.key.remoteJid !== key.remoteJid) {
        const storedJid = stored.key.remoteJid;
        const storedNumber = storedJid.replace(/@s\.whatsapp\.net$|@g\.us$|@lid$/g, '');
        const fixedKey = { ...key, remoteJid: storedJid };
        console.log(`[EDIT-DEBUG] Retrying with stored JID: ${storedJid} (was ${key.remoteJid})`);
        const res2 = await apiFetch(`${BASE}/chat/updateMessage/${instanceName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ number: storedNumber, key: fixedKey, text }),
        });
        if (res2.ok) {
          console.log(`[EDIT-DEBUG] updateMessage SUCCESS on retry with stored JID`);
          return res2.json();
        }
        const body2 = await res2.text();
        throw new Error(`updateMessage retry failed (${res2.status}): ${body2.slice(0, 200)}`);
      } else if (!stored) {
        console.log(`[EDIT-DEBUG] Message not found in DB by key.id=${key.id}`);
      } else {
        console.log(`[EDIT-DEBUG] Stored JID matches webhook JID — no alternate to try`);
      }
    } catch (lookupErr) {
      if (lookupErr instanceof Error && lookupErr.message.includes('retry failed')) throw lookupErr;
      console.error('[EVO-CLIENT] Key lookup failed:', lookupErr);
    }
  }

  throw new Error(`updateMessage failed (${res.status}): ${body.slice(0, 200)}`);
}

// Fetch recent messages for a chat from Evolution API's database.
export async function findMessages(instanceName: string, where: Record<string, unknown>, limit = 50): Promise<any[]> {
  try {
    const res = await apiFetch(`${BASE}/chat/findMessages/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ where, limit }),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return Array.isArray(data) ? data : data?.messages || data?.data || [];
  } catch {
    return [];
  }
}

// Look up a message by its key.id in Evolution API's database.
async function findMessageByKeyId(instanceName: string, keyId: string): Promise<any> {
  const res = await apiFetch(`${BASE}/chat/findMessages/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ where: { key: { id: keyId } } }),
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  const messages = Array.isArray(data) ? data : data?.messages || data?.data || [];
  return messages[0] || null;
}

// Delete a message for everyone
export async function deleteForEveryone(
  instanceName: string,
  key: { remoteJid: string; fromMe: boolean; id: string; participant?: string },
) {
  const res = await apiFetch(`${BASE}/chat/deleteMessageForEveryone/${instanceName}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(key),
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

// Update profile status/bio text
export async function updateProfileStatus(instanceName: string, status: string) {
  const res = await apiFetch(`${BASE}/chat/updateProfileStatus/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ status }),
  });
  return res.json();
}

// Update profile picture (base64 image)
export async function updateProfilePicture(instanceName: string, pictureBase64: string) {
  const res = await apiFetch(`${BASE}/chat/updateProfilePicture/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ picture: pictureBase64 }),
  });
  return res.json();
}

// Fetch profile picture URL for a number
export async function fetchProfilePictureUrl(instanceName: string, number: string) {
  const cleanNumber = number.replace(/@s\.whatsapp\.net$|@g\.us$|@lid$/g, '') || number;
  const res = await apiFetch(`${BASE}/chat/fetchProfilePictureUrl/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: cleanNumber }),
  });
  return res.json();
}

// Fetch full profile (name, about/status, picture) for a number
export async function fetchProfile(instanceName: string, number: string) {
  const cleanNumber = number.replace(/@s\.whatsapp\.net$|@g\.us$|@lid$/g, '') || number;
  const res = await apiFetch(`${BASE}/chat/fetchProfile/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: cleanNumber }),
  });
  return res.json();
}

// Check if a number is on WhatsApp
export async function checkOnWhatsApp(instanceName: string, numbers: string[]) {
  const cleanNumbers = numbers.map(n => n.replace(/@s\.whatsapp\.net$|@g\.us$|@lid$/g, ''));
  const res = await apiFetch(`${BASE}/chat/whatsappNumbers/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ numbers: cleanNumbers }),
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

// Download media from a message via Evolution API's getBase64FromMediaMessage endpoint.
// This is more reliable than direct CDN download because Evolution API uses the
// active Baileys client to decrypt and fetch the media.
// `fullMessage` must be the full WhatsApp message with both `key` and `message` properties.
export async function getBase64FromMediaMessage(instanceName: string, fullMessage: Record<string, unknown>): Promise<Buffer | null> {
  try {
    const res = await apiFetch(`${BASE}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: fullMessage }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data?.base64) return Buffer.from(data.base64, 'base64');
    return null;
  } catch (err) {
    console.error(`[EVO-CLIENT] getBase64FromMediaMessage failed for ${instanceName}:`, err);
    return null;
  }
}

// Fetch group metadata (info + participants) via Evolution API
export async function fetchGroupInfo(instanceName: string, groupJid: string) {
  const jid = groupJid.includes('@') ? groupJid : `${groupJid}@g.us`;
  try {
    const res = await apiFetch(`${BASE}/group/findGroupInfos/${instanceName}?groupJid=${jid}`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[EVO-CLIENT] fetchGroupInfo ${instanceName} ${jid} failed:`, err);
    return null;
  }
}

/**
 * Verify that Evolution API has data persistence enabled.
 * Queries the fetchInstances endpoint and checks if instances survive.
 * Called on startup to warn operators if sessions will be lost on redeploy.
 */
export async function verifyEvolutionDataPersistence(): Promise<{ persisted: boolean; instanceCount: number }> {
  if (!BASE) return { persisted: false, instanceCount: 0 };
  try {
    const res = await apiFetch(`${BASE}/instance/fetchInstances`, {
      method: 'GET',
      headers,
      skipHealthCount: true,
    });
    if (!res.ok) return { persisted: false, instanceCount: 0 };
    const data: any = await res.json();
    const instances = Array.isArray(data) ? data : [];
    // If Evolution API returned instances, it means DATABASE_SAVE_DATA_INSTANCE=true
    // is working (instances survived the last restart).
    return { persisted: instances.length > 0, instanceCount: instances.length };
  } catch {
    return { persisted: false, instanceCount: 0 };
  }
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

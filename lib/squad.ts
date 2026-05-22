/**
 * Squad Payment Gateway client.
 *
 * Docs: https://docs.squadco.com
 * Supports bank transfer payments for subscription plans.
 * Requires SQUAD_SECRET_KEY and SQUAD_PUBLIC_KEY env vars.
 */

import crypto from 'crypto';

const LIVE_BASE = 'https://api-d.squadco.com';
const SANDBOX_BASE = 'https://sandbox-api-d.squadco.com';

function getBaseUrl(): string {
  return process.env.SQUAD_SANDBOX === 'true' ? SANDBOX_BASE : LIVE_BASE;
}

function getSecretKey(): string {
  return process.env.SQUAD_SECRET_KEY || '';
}

export function getPublicKey(): string {
  return process.env.SQUAD_PUBLIC_KEY || '';
}

// ─── Plan Configuration ───────────────────────────────────────────────────────

export interface PlanConfig {
  name: string;
  price: number; // Naira
  quotaLimit: number;
  sessionLimit: number;
  aiDailyLimit: number;
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: 'Free',
    price: 0,
    quotaLimit: 300,
    sessionLimit: 1,
    aiDailyLimit: 10,
    features: [
      'Basic commands',
      '300 messages/month',
      '1 session',
      '10 AI queries/day',
      'Message templates (3)',
      'Rate limit dashboard',
    ],
  },
  lite: {
    name: 'Lite',
    price: 500,
    quotaLimit: 2000,
    sessionLimit: 1,
    aiDailyLimit: 50,
    features: [
      'All commands',
      '2,000 messages/month',
      '1 session',
      '50 AI queries/day',
      'Auto reply',
      'Message templates (10)',
      'Custom commands (5)',
      'Rate limit dashboard',
      'QR expiry alerts (email)',
    ],
  },
  standard: {
    name: 'Standard',
    price: 2000,
    quotaLimit: 10000,
    sessionLimit: 3,
    aiDailyLimit: 200,
    features: [
      'All commands',
      '10,000 messages/month',
      '3 sessions',
      '200 AI queries/day',
      'Auto reply',
      'Status viewer',
      'Priority support',
      'Message templates (50)',
      'Custom commands (20)',
      'Group analytics',
      'Chatbot flow builder (3 flows)',
      'Rate limit dashboard',
      'QR expiry alerts (email + WhatsApp)',
    ],
  },
  boss: {
    name: 'Boss',
    price: 5000,
    quotaLimit: -1,
    sessionLimit: 5,
    aiDailyLimit: -1,
    features: [
      'Everything unlimited',
      'Unlimited messages',
      '5 sessions',
      'Unlimited AI queries',
      'API access',
      'Custom branding',
      'Priority support',
      'Unlimited templates',
      'Unlimited custom commands',
      'Group analytics + export',
      'Chatbot flow builder (unlimited)',
      'E-commerce integration',
      'Rate limit dashboard',
      'QR expiry alerts (all channels)',
    ],
  },
};

// ─── Payment Initialization ───────────────────────────────────────────────────

export interface InitPaymentParams {
  email: string;
  amount: number; // Naira (will be converted to kobo)
  transactionRef: string;
  customerName?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitPaymentResult {
  success: boolean;
  checkoutUrl?: string;
  transactionRef?: string;
  error?: string;
}

const SQUAD_API_TIMEOUT_MS = 10_000; // 10s timeout for Squad API calls

/**
 * Initialize a payment transaction via Squad API.
 * Uses bank transfer channel only as per requirements.
 * Has a 10-second timeout to prevent hanging requests.
 */
export async function initializePayment(params: InitPaymentParams): Promise<InitPaymentResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    console.error('[SQUAD] initializePayment BLOCKED: SQUAD_SECRET_KEY is empty/missing');
    return { success: false, error: 'SQUAD_SECRET_KEY not configured' };
  }

  const baseUrl = getBaseUrl();
  const amountKobo = params.amount * 100;
  console.log(`[SQUAD] initializePayment START: ref=${params.transactionRef} email=${params.email} amount=₦${params.amount} (${amountKobo} kobo) baseUrl=${baseUrl}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SQUAD_API_TIMEOUT_MS);
    const startMs = Date.now();

    const res = await fetch(`${baseUrl}/transaction/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: amountKobo,
        initiate_type: 'inline',
        currency: 'NGN',
        transaction_ref: params.transactionRef,
        customer_name: params.customerName,
        callback_url: params.callbackUrl,
        payment_channels: ['bank', 'transfer'],
        metadata: params.metadata,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const elapsedMs = Date.now() - startMs;
    console.log(`[SQUAD] initializePayment HTTP ${res.status} in ${elapsedMs}ms ref=${params.transactionRef}`);

    const rawText = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      console.error(`[SQUAD] initializePayment non-JSON response (${res.status}): ${rawText.slice(0, 500)}`);
      return { success: false, error: `Squad returned non-JSON (HTTP ${res.status})` };
    }

    console.log(`[SQUAD] initializePayment response: status=${data.status} message=${data.message || 'none'} hasData=${!!data.data}`);

    if (data.status === 200) {
      const innerData = data.data as Record<string, unknown> | undefined;
      const checkoutUrl = innerData?.checkout_url as string | undefined;
      console.log(`[SQUAD] initializePayment SUCCESS: ref=${params.transactionRef} checkoutUrl=${checkoutUrl || 'NONE'}`);
      return {
        success: true,
        checkoutUrl,
        transactionRef: params.transactionRef,
      };
    }

    console.error(`[SQUAD] initializePayment FAILED: status=${data.status} message=${data.message} ref=${params.transactionRef}`);
    return {
      success: false,
      error: (data.message as string) || `Squad returned status: ${data.status}`,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[SQUAD] initializePayment TIMEOUT after ${SQUAD_API_TIMEOUT_MS}ms ref=${params.transactionRef}`);
      return { success: false, error: 'Squad API timed out - please try again' };
    }
    console.error(`[SQUAD] initializePayment EXCEPTION ref=${params.transactionRef}:`, err);
    return {
      success: false,
      error: `Squad API error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Payment Verification ─────────────────────────────────────────────────────

export interface VerifyPaymentResult {
  success: boolean;
  transactionRef?: string;
  amount?: number;
  status?: string;
  error?: string;
}

export async function verifyPayment(transactionRef: string): Promise<VerifyPaymentResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    console.error('[SQUAD] verifyPayment BLOCKED: SQUAD_SECRET_KEY is empty/missing');
    return { success: false, error: 'SQUAD_SECRET_KEY not configured' };
  }

  const baseUrl = getBaseUrl();
  console.log(`[SQUAD] verifyPayment START: ref=${transactionRef} baseUrl=${baseUrl}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SQUAD_API_TIMEOUT_MS);
    const startMs = Date.now();

    const res = await fetch(`${baseUrl}/transaction/verify/${transactionRef}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const elapsedMs = Date.now() - startMs;
    console.log(`[SQUAD] verifyPayment HTTP ${res.status} in ${elapsedMs}ms ref=${transactionRef}`);

    const rawText = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      console.error(`[SQUAD] verifyPayment non-JSON response (${res.status}): ${rawText.slice(0, 500)}`);
      return { success: false, error: `Squad returned non-JSON (HTTP ${res.status})` };
    }

    console.log(`[SQUAD] verifyPayment response: status=${data.status} hasData=${!!data.data} ref=${transactionRef}`);

    if (data.status === 200) {
      const innerData = data.data as Record<string, unknown> | undefined;
      console.log(`[SQUAD] verifyPayment SUCCESS: ref=${transactionRef} txStatus=${innerData?.transaction_status}`);
      return {
        success: true,
        transactionRef: innerData?.transaction_ref as string | undefined,
        amount: innerData?.transaction_amount as number | undefined,
        status: innerData?.transaction_status as string | undefined,
      };
    }

    console.error(`[SQUAD] verifyPayment FAILED: status=${data.status} message=${data.message} ref=${transactionRef}`);
    return { success: false, error: (data.message as string) || 'Verification failed' };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[SQUAD] verifyPayment TIMEOUT after ${SQUAD_API_TIMEOUT_MS}ms ref=${transactionRef}`);
      return { success: false, error: 'Squad verify timed out - please try again' };
    }
    console.error(`[SQUAD] verifyPayment EXCEPTION ref=${transactionRef}:`, err);
    return {
      success: false,
      error: `Squad verify error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Webhook Signature Validation ─────────────────────────────────────────────

/**
 * Validate Squad webhook signature (HMAC SHA512).
 * The hash is sent in x-squad-encrypted-body header.
 */
export function validateWebhookSignature(payload: string, signature: string): boolean {
  const secretKey = getSecretKey();
  if (!secretKey || !signature) return false;

  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(payload)
    .digest('hex');

  return hash.toLowerCase() === signature.toLowerCase();
}

/**
 * Flutterwave Payment Gateway client.
 *
 * Docs: https://developer.flutterwave.com
 * Requires FLW_SECRET_KEY and FLW_SECRET_HASH env vars.
 */

import crypto from 'crypto';

const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';
const FLW_API_TIMEOUT_MS = 10_000;

function getSecretKey(): string {
  return process.env.FLW_SECRET_KEY || '';
}

function getSecretHash(): string {
  return process.env.FLW_SECRET_HASH || '';
}

export function getPublicKey(): string {
  return process.env.FLW_PUBLIC_KEY || '';
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
    price: 1000,
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
    price: 2000,
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
  amount: number; // Naira
  transactionRef: string;
  customerName?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  currency?: string;
  paymentOptions?: string[];
}

export interface InitPaymentResult {
  success: boolean;
  checkoutUrl?: string;
  transactionRef?: string;
  providerReference?: string;
  error?: string;
}

interface FlutterwaveApiResponse<T = Record<string, unknown>> {
  status?: string;
  message?: string;
  data?: T;
}

export async function initializePayment(params: InitPaymentParams): Promise<InitPaymentResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    console.error('[FLW] initializePayment BLOCKED: FLW_SECRET_KEY is empty/missing');
    return { success: false, error: 'FLW_SECRET_KEY not configured' };
  }

  const currency = params.currency || 'NGN';
  const paymentOptions = params.paymentOptions?.length
    ? params.paymentOptions.join(',')
    : 'card,banktransfer,ussd';

  console.log(
    `[FLW] initializePayment START: ref=${params.transactionRef} email=${params.email} amount=₦${params.amount} currency=${currency}`,
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FLW_API_TIMEOUT_MS);
    const startMs = Date.now();

    const res = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: params.transactionRef,
        amount: params.amount,
        currency,
        redirect_url: params.callbackUrl,
        payment_options: paymentOptions,
        customer: {
          email: params.email,
          name: params.customerName || params.email,
        },
        customizations: {
          title: 'BotWave Subscription',
          description: 'BotWave plan upgrade payment',
        },
        metadata: params.metadata,
        meta: params.metadata,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const elapsedMs = Date.now() - startMs;
    console.log(`[FLW] initializePayment HTTP ${res.status} in ${elapsedMs}ms ref=${params.transactionRef}`);

    const rawText = await res.text();
    let data: FlutterwaveApiResponse<{ link?: string; tx_ref?: string; flw_ref?: string }>;

    try {
      data = JSON.parse(rawText) as FlutterwaveApiResponse<{ link?: string; tx_ref?: string; flw_ref?: string }>;
    } catch {
      console.error(`[FLW] initializePayment non-JSON response (${res.status}): ${rawText.slice(0, 500)}`);
      return { success: false, error: `Flutterwave returned non-JSON (HTTP ${res.status})` };
    }

    const checkoutUrl = data.data?.link;
    const txRef = data.data?.tx_ref || params.transactionRef;

    if (res.ok && data.status === 'success' && checkoutUrl) {
      console.log(`[FLW] initializePayment SUCCESS: ref=${txRef} checkoutUrl=${checkoutUrl}`);
      return {
        success: true,
        checkoutUrl,
        transactionRef: txRef,
        providerReference: data.data?.flw_ref,
      };
    }

    console.error(`[FLW] initializePayment FAILED: status=${data.status} message=${data.message} ref=${params.transactionRef}`);
    return {
      success: false,
      error: data.message || `Flutterwave returned status: ${data.status || res.status}`,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[FLW] initializePayment TIMEOUT after ${FLW_API_TIMEOUT_MS}ms ref=${params.transactionRef}`);
      return { success: false, error: 'Flutterwave API timed out - please try again' };
    }

    console.error(`[FLW] initializePayment EXCEPTION ref=${params.transactionRef}:`, err);
    return {
      success: false,
      error: `Flutterwave API error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Payment Verification ─────────────────────────────────────────────────────

export interface VerifyPaymentResult {
  success: boolean;
  transactionRef?: string;
  providerReference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paymentType?: string;
  error?: string;
}

export async function verifyPayment(transactionRef: string): Promise<VerifyPaymentResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    console.error('[FLW] verifyPayment BLOCKED: FLW_SECRET_KEY is empty/missing');
    return { success: false, error: 'FLW_SECRET_KEY not configured' };
  }

  console.log(`[FLW] verifyPayment START: ref=${transactionRef}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FLW_API_TIMEOUT_MS);
    const startMs = Date.now();

    const res = await fetch(
      `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionRef)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    const elapsedMs = Date.now() - startMs;
    console.log(`[FLW] verifyPayment HTTP ${res.status} in ${elapsedMs}ms ref=${transactionRef}`);

    const rawText = await res.text();
    let data: FlutterwaveApiResponse<{
      tx_ref?: string;
      flw_ref?: string;
      amount?: number;
      currency?: string;
      status?: string;
      payment_type?: string;
    }>;

    try {
      data = JSON.parse(rawText) as FlutterwaveApiResponse<{
        tx_ref?: string;
        flw_ref?: string;
        amount?: number;
        currency?: string;
        status?: string;
        payment_type?: string;
      }>;
    } catch {
      console.error(`[FLW] verifyPayment non-JSON response (${res.status}): ${rawText.slice(0, 500)}`);
      return { success: false, error: `Flutterwave returned non-JSON (HTTP ${res.status})` };
    }

    if (res.ok && data.status === 'success' && data.data) {
      console.log(`[FLW] verifyPayment SUCCESS: ref=${transactionRef} status=${data.data.status}`);
      return {
        success: true,
        transactionRef: data.data.tx_ref,
        providerReference: data.data.flw_ref,
        amount: data.data.amount,
        currency: data.data.currency,
        status: data.data.status,
        paymentType: data.data.payment_type,
      };
    }

    console.error(`[FLW] verifyPayment FAILED: status=${data.status} message=${data.message} ref=${transactionRef}`);
    return { success: false, error: data.message || 'Verification failed' };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[FLW] verifyPayment TIMEOUT after ${FLW_API_TIMEOUT_MS}ms ref=${transactionRef}`);
      return { success: false, error: 'Flutterwave verify timed out - please try again' };
    }

    console.error(`[FLW] verifyPayment EXCEPTION ref=${transactionRef}:`, err);
    return {
      success: false,
      error: `Flutterwave verify error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Webhook Signature Validation ─────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  const normalizedA = a.trim();
  const normalizedB = b.trim();
  const aBuffer = Buffer.from(normalizedA);
  const bBuffer = Buffer.from(normalizedB);

  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function validateWebhookHash(verifHash: string): boolean {
  const secretHash = getSecretHash();
  if (!secretHash || !verifHash) return false;

  return safeCompare(secretHash, verifHash);
}

export function validateWebhookHmacSignature(payload: string, signature: string): boolean {
  if (!payload || !signature) return false;

  const secret = getSecretHash() || getSecretKey();
  if (!secret) return false;

  const normalizedSignature = signature.replace(/^sha256=/i, '').trim().toLowerCase();
  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .toLowerCase();

  return safeCompare(computed, normalizedSignature);
}

/**
 * Validate Flutterwave webhook signature.
 * Primary check: `verif-hash` header must match FLW_SECRET_HASH.
 * Secondary check: optional `flutterwave-signature` HMAC SHA256.
 */
export function validateWebhookSignature(
  payload: string,
  verifHash: string,
  flutterwaveSignature?: string,
): boolean {
  if (validateWebhookHash(verifHash)) {
    return true;
  }

  if (flutterwaveSignature && validateWebhookHmacSignature(payload, flutterwaveSignature)) {
    return true;
  }

  return false;
}

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
    features: ['Basic commands'],
  },
  lite: {
    name: 'Lite',
    price: 500,
    quotaLimit: 2000,
    sessionLimit: 1,
    aiDailyLimit: 50,
    features: ['All commands', 'Auto-reply'],
  },
  standard: {
    name: 'Standard',
    price: 1000,
    quotaLimit: 10000,
    sessionLimit: 3,
    aiDailyLimit: 200,
    features: ['All commands', 'Auto-reply', 'Status viewer', 'Priority support'],
  },
  boss: {
    name: 'Boss',
    price: 2000,
    quotaLimit: -1, // unlimited
    sessionLimit: 5,
    aiDailyLimit: -1, // unlimited
    features: ['Everything', 'Unlimited messages', 'Unlimited AI', 'API access'],
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

/**
 * Initialize a payment transaction via Squad API.
 * Uses bank transfer channel only as per requirements.
 */
export async function initializePayment(params: InitPaymentParams): Promise<InitPaymentResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return { success: false, error: 'SQUAD_SECRET_KEY not configured' };
  }

  try {
    const res = await fetch(`${getBaseUrl()}/transaction/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount * 100, // Convert Naira to kobo
        initiate_type: 'inline',
        currency: 'NGN',
        transaction_ref: params.transactionRef,
        customer_name: params.customerName,
        callback_url: params.callbackUrl,
        payment_channels: ['bank', 'transfer'],
        metadata: params.metadata,
      }),
    });

    const data = await res.json() as Record<string, unknown>;

    if (data.status === 200) {
      const innerData = data.data as Record<string, unknown> | undefined;
      return {
        success: true,
        checkoutUrl: innerData?.checkout_url as string | undefined,
        transactionRef: params.transactionRef,
      };
    }

    return {
      success: false,
      error: (data.message as string) || `Squad returned status: ${data.status}`,
    };
  } catch (err) {
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
    return { success: false, error: 'SQUAD_SECRET_KEY not configured' };
  }

  try {
    const res = await fetch(`${getBaseUrl()}/transaction/verify/${transactionRef}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    });

    const data = await res.json() as Record<string, unknown>;

    if (data.status === 200) {
      const innerData = data.data as Record<string, unknown> | undefined;
      return {
        success: true,
        transactionRef: innerData?.transaction_ref as string | undefined,
        amount: innerData?.transaction_amount as number | undefined,
        status: innerData?.transaction_status as string | undefined,
      };
    }

    return { success: false, error: (data.message as string) || 'Verification failed' };
  } catch (err) {
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

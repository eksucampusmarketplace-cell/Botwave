/**
 * Inlomax VTU API client — sends airtime top-ups for reward cashouts.
 *
 * API docs: https://inlomax.com/docs/airtime
 * Requires INLOMAX_API_KEY env var.
 */

const BASE_URL = 'https://inlomax.com/api';
const SANDBOX_URL = 'https://inlomax.com/sandbox';
const REQUEST_TIMEOUT = 15_000;

function getApiKey(): string {
  return process.env.INLOMAX_API_KEY || '';
}

function getBaseUrl(): string {
  return process.env.INLOMAX_SANDBOX === 'true' ? SANDBOX_URL : BASE_URL;
}

/**
 * Network detection from Nigerian phone number prefixes.
 * Returns the Inlomax serviceID for the detected network.
 */
const NETWORK_PREFIXES: Record<string, { network: string; serviceID: string }> = {
  // MTN
  '0803': { network: 'MTN', serviceID: '1' },
  '0806': { network: 'MTN', serviceID: '1' },
  '0810': { network: 'MTN', serviceID: '1' },
  '0813': { network: 'MTN', serviceID: '1' },
  '0814': { network: 'MTN', serviceID: '1' },
  '0816': { network: 'MTN', serviceID: '1' },
  '0903': { network: 'MTN', serviceID: '1' },
  '0906': { network: 'MTN', serviceID: '1' },
  '0913': { network: 'MTN', serviceID: '1' },
  '0916': { network: 'MTN', serviceID: '1' },
  '0703': { network: 'MTN', serviceID: '1' },
  '0706': { network: 'MTN', serviceID: '1' },
  // Airtel
  '0802': { network: 'AIRTEL', serviceID: '2' },
  '0808': { network: 'AIRTEL', serviceID: '2' },
  '0812': { network: 'AIRTEL', serviceID: '2' },
  '0701': { network: 'AIRTEL', serviceID: '2' },
  '0708': { network: 'AIRTEL', serviceID: '2' },
  '0902': { network: 'AIRTEL', serviceID: '2' },
  '0901': { network: 'AIRTEL', serviceID: '2' },
  '0904': { network: 'AIRTEL', serviceID: '2' },
  '0907': { network: 'AIRTEL', serviceID: '2' },
  '0912': { network: 'AIRTEL', serviceID: '2' },
  // Glo
  '0805': { network: 'GLO', serviceID: '3' },
  '0807': { network: 'GLO', serviceID: '3' },
  '0811': { network: 'GLO', serviceID: '3' },
  '0815': { network: 'GLO', serviceID: '3' },
  '0705': { network: 'GLO', serviceID: '3' },
  '0905': { network: 'GLO', serviceID: '3' },
  '0915': { network: 'GLO', serviceID: '3' },
  // 9Mobile
  '0809': { network: '9MOBILE', serviceID: '4' },
  '0817': { network: '9MOBILE', serviceID: '4' },
  '0818': { network: '9MOBILE', serviceID: '4' },
  '0908': { network: '9MOBILE', serviceID: '4' },
  '0909': { network: '9MOBILE', serviceID: '4' },
};

export function detectNetwork(phone: string): { network: string; serviceID: string } | null {
  // Normalize: remove country code prefix, spaces, dashes
  let normalized = phone.replace(/[\s\-+]/g, '');

  // Convert 234xxx to 0xxx
  if (normalized.startsWith('234')) {
    normalized = '0' + normalized.slice(3);
  }
  // Convert country code without leading 234
  if (normalized.length === 10 && !normalized.startsWith('0')) {
    normalized = '0' + normalized;
  }

  const prefix = normalized.slice(0, 4);
  return NETWORK_PREFIXES[prefix] || null;
}

export interface AirtimeResult {
  success: boolean;
  reference?: string;
  network?: string;
  error?: string;
}

/**
 * Send airtime to a Nigerian phone number via Inlomax API.
 * Amount is in Naira (e.g. 100 for ₦100).
 */
export async function sendAirtime(phoneNumber: string, amount: number): Promise<AirtimeResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { success: false, error: 'INLOMAX_API_KEY not configured' };
  }

  const networkInfo = detectNetwork(phoneNumber);
  if (!networkInfo) {
    return { success: false, error: `Cannot detect network for ${phoneNumber}` };
  }

  // Normalize phone to 0xxx format for Inlomax
  let normalized = phoneNumber.replace(/[\s\-+]/g, '');
  if (normalized.startsWith('234')) {
    normalized = '0' + normalized.slice(3);
  }
  if (normalized.length === 10 && !normalized.startsWith('0')) {
    normalized = '0' + normalized;
  }

  const requestId = `bw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const res = await fetch(`${getBaseUrl()}/airtime`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceID: networkInfo.serviceID,
        amount,
        mobileNumber: normalized,
        'request-id': requestId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json() as Record<string, unknown>;

    if (data.status === 'success') {
      const innerData = data.data as Record<string, unknown> | undefined;
      return {
        success: true,
        reference: (innerData?.reference as string) || requestId,
        network: networkInfo.network,
      };
    }

    return {
      success: false,
      error: (data.message as string) || `Inlomax returned status: ${data.status}`,
      network: networkInfo.network,
    };
  } catch (err) {
    return {
      success: false,
      error: `Inlomax API error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

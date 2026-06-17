/**
 * Inlomax airtime API stubs — Telegram-only deployment.
 */

export interface NetworkInfo {
  network: string;
  country: string;
}

export function detectNetwork(_phone: string): NetworkInfo {
  return { network: 'unknown', country: 'unknown' };
}

export async function sendAirtime(_phone: string, _amount: number): Promise<{ success: boolean; reference?: string; error?: string }> {
  return { success: false };
}

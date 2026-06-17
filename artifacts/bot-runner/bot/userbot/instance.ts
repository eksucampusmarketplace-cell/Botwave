/**
 * Telegram Userbot (MTProto) instance stub — not used in this deployment.
 */

export interface UserbotInitOptions {
  sessionId: string;
  userId: string;
  apiId: number;
  apiHash: string;
  sessionString: string;
  phoneNumber: string;
}

export class TelegramUserbotInstance {
  sessionId: string;
  constructor(opts: UserbotInitOptions | string) {
    this.sessionId = typeof opts === 'string' ? opts : opts.sessionId;
  }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  getSocket(): null { return null; }
  getStatus(): { isReady: boolean; isReconnecting: boolean; isPairingSent: boolean; pairingStartedAt: number; isQrPending: boolean } {
    return { isReady: false, isReconnecting: false, isPairingSent: false, pairingStartedAt: 0, isQrPending: false };
  }
}

/**
 * WhatsApp Evolution WebSocket adapter stub — Telegram-only deployment.
 */

export class EvolutionSocketAdapter {
  sessionId: string;
  userId?: string;
  phoneNumber?: string;

  constructor(sessionId: string, _instanceId?: string, _userId?: string, _phoneNumber?: string) {
    this.sessionId = sessionId;
    this.userId = _userId;
    this.phoneNumber = _phoneNumber;
  }
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async sendMessage(_jid: string, _content: unknown): Promise<void> {}
  async sendPresenceUpdate(_status: string): Promise<void> {}
}

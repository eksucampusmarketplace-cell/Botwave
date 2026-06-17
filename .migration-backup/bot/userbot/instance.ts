/**
 * TelegramUserbotInstance - integrates directly into BotManager's activeBots map.
 * Implements the same interface as TelegramBotInstance (getSocket, start, stop, getStatus)
 * so the sync loop can manage Telegram userbots identically to Telegram bots.
 *
 * Uses UserbotClient (GramJS MTProto) under the hood. No QR codes, no pairing -
 * just connects with the stored session string and stays active, exactly like
 * TelegramBotInstance connects with a bot token.
 */

import { type UserbotClientConfig } from './client';
import { UserbotManager } from './manager';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface UserbotInstanceConfig {
  sessionId: string;
  userId: string;
  apiId: number;
  apiHash: string;
  sessionString: string;
  phoneNumber?: string;
}

/**
 * Standalone userbot manager instance shared across all TelegramUserbotInstance
 * objects so handler registration & heartbeat logic is reused.
 */
const sharedManager = new UserbotManager();
let heartbeatStarted = false;

export class TelegramUserbotInstance {
  private sessionId: string;
  private userId: string;
  private apiId: number;
  private apiHash: string;
  private sessionString: string;
  private phoneNumber?: string;
  private isReady = false;
  private isReconnecting = false;
  private stopped = false;

  constructor(config: UserbotInstanceConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.apiId = config.apiId;
    this.apiHash = config.apiHash;
    this.sessionString = config.sessionString;
    this.phoneNumber = config.phoneNumber;
  }

  /** Compatibility with BotManager's activeBots interface */
  public getSocket(): any {
    return this.isReady ? {} : null;
  }

  async start(): Promise<void> {
    if (this.stopped) return;

    if (!this.sessionString) {
      console.error(`[USERBOT-INST] Session ${this.sessionId.slice(0, 8)} has no session_string - cannot start`);
      await this.markError('Missing session_string');
      return;
    }

    if (!this.apiId || !this.apiHash) {
      console.error(`[USERBOT-INST] Session ${this.sessionId.slice(0, 8)} missing api_id/api_hash`);
      await this.markError('Missing api_id or api_hash');
      return;
    }

    const config: UserbotClientConfig = {
      sessionId: this.sessionId,
      userId: this.userId,
      apiId: this.apiId,
      apiHash: this.apiHash,
      sessionString: this.sessionString,
      phoneNumber: this.phoneNumber,
    };

    console.log(`[USERBOT-INST] Starting userbot for session ${this.sessionId.slice(0, 8)}...`);

    try {
      const success = await sharedManager.startUserbot(config);
      if (success) {
        this.isReady = true;
        // Mark session as active in DB (same as TelegramBotInstance does)
        await supabase
          .from('bot_sessions')
          .update({
            state: 'active',
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', this.sessionId);

        console.log(`[USERBOT-INST] Session ${this.sessionId.slice(0, 8)} is now active`);

        // Start shared heartbeat (once for all userbots)
        if (!heartbeatStarted) {
          sharedManager.startHeartbeat(30_000);
          heartbeatStarted = true;
        }
      } else {
        await this.markError('Connection failed');
      }
    } catch (err) {
      console.error(`[USERBOT-INST] Failed to start session ${this.sessionId.slice(0, 8)}:`, err);
      await this.markError('Start error');
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.isReady = false;
    await sharedManager.stopUserbot(this.sessionId, true);
    console.log(`[USERBOT-INST] Session ${this.sessionId.slice(0, 8)} stopped`);
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isReconnecting: this.isReconnecting,
      isQrPending: false,
      isPairingSent: false,
      pairingStartedAt: 0,
    };
  }

  private async markError(reason: string): Promise<void> {
    console.error(`[USERBOT-INST] Session ${this.sessionId.slice(0, 8)} error: ${reason}`);
    await supabase
      .from('bot_sessions')
      .update({
        state: 'error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.sessionId);
  }
}

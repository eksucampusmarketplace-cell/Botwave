/**
 * GramJS MTProto client wrapper for Telegram userbot.
 * Handles connection, proxy rotation, session management, and humanization.
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { getNextProxy, getGramJSProxyConfig, recordProxyFailure, recordProxySuccess, type ProxyEntry } from './utils/proxy';
import {
  getRandomDeviceModel,
  getRandomSystemVersion,
  getRandomAppVersion,
  humanDelay,
  getPresenceCycle,
  getActivityMultiplier,
} from './utils/humanizer';

export interface UserbotClientConfig {
  sessionId: string;
  userId: string;
  apiId: number;
  apiHash: string;
  sessionString: string;
  phoneNumber?: string;
}

export class UserbotClient {
  public client: TelegramClient;
  public sessionId: string;
  public userId: string;
  private currentProxy: ProxyEntry | null = null;
  private presenceHandle: ReturnType<typeof setTimeout> | null = null;
  private isOnline = false;
  private stopped = false;
  private deviceModel: string;
  private systemVersion: string;
  private appVersion: string;

  constructor(config: UserbotClientConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.deviceModel = getRandomDeviceModel();
    this.systemVersion = getRandomSystemVersion();
    this.appVersion = getRandomAppVersion();

    const session = new StringSession(config.sessionString || '');
    this.currentProxy = getNextProxy();

    const clientOpts: ConstructorParameters<typeof TelegramClient>[3] = {
      connectionRetries: 5,
      retryDelay: 2000,
      autoReconnect: true,
      deviceModel: this.deviceModel,
      systemVersion: this.systemVersion,
      appVersion: this.appVersion,
      langCode: 'en',
      systemLangCode: 'en',
      useWSS: false,
    };

    if (this.currentProxy) {
      const proxyConfig = getGramJSProxyConfig(this.currentProxy);
      (clientOpts as Record<string, unknown>).proxy = proxyConfig;
      console.log(`[USERBOT-CLIENT] ${config.sessionId.slice(0, 8)} using proxy ${this.currentProxy.host}:${this.currentProxy.port}`);
    } else {
      console.warn(`[USERBOT-CLIENT] ${config.sessionId.slice(0, 8)} NO proxy — connecting directly`);
    }

    this.client = new TelegramClient(
      session,
      config.apiId,
      config.apiHash,
      clientOpts,
    );
  }

  async connect(): Promise<boolean> {
    try {
      console.log(`[USERBOT-CLIENT] Connecting ${this.sessionId.slice(0, 8)} (device: ${this.deviceModel})...`);
      await this.client.connect();

      if (this.currentProxy) {
        recordProxySuccess(this.currentProxy);
      }

      const me = await this.client.getMe() as Api.User;
      console.log(`[USERBOT-CLIENT] Connected as ${me.firstName} (@${me.username || 'no_username'}) ID: ${me.id}`);

      return true;
    } catch (err) {
      console.error(`[USERBOT-CLIENT] Connection failed for ${this.sessionId.slice(0, 8)}:`, err);
      if (this.currentProxy) {
        recordProxyFailure(this.currentProxy);
      }
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stopped = true;
    this.stopPresenceSimulation();
    try {
      await this.client.disconnect();
    } catch {}
  }

  // ─── Presence Simulation ────────────────────────────────────────────────────

  startPresenceSimulation(timezoneOffset = 1): void {
    if (this.presenceHandle) return;

    const cycle = async () => {
      if (this.stopped) return;

      const multiplier = getActivityMultiplier(timezoneOffset);

      // During very low activity periods, stay mostly offline
      if (multiplier < 0.2) {
        this.isOnline = false;
        try {
          await this.client.invoke(new Api.account.UpdateStatus({ offline: true }));
        } catch {}
        const sleepMs = 10 * 60_000 + Math.random() * 20 * 60_000;
        this.presenceHandle = setTimeout(cycle, sleepMs);
        return;
      }

      const { onlineMs, offlineMs } = getPresenceCycle();
      const scaledOnline = Math.round(onlineMs * multiplier);
      const scaledOffline = Math.round(offlineMs / multiplier);

      // Go online
      this.isOnline = true;
      try {
        await this.client.invoke(new Api.account.UpdateStatus({ offline: false }));
      } catch {}

      await humanDelay(scaledOnline * 0.8, scaledOnline * 1.2);

      if (this.stopped) return;

      // Go offline
      this.isOnline = false;
      try {
        await this.client.invoke(new Api.account.UpdateStatus({ offline: true }));
      } catch {}

      this.presenceHandle = setTimeout(cycle, scaledOffline);
    };

    // Start with a short random delay
    this.presenceHandle = setTimeout(cycle, 5000 + Math.random() * 10000);
  }

  stopPresenceSimulation(): void {
    if (this.presenceHandle) {
      clearTimeout(this.presenceHandle);
      this.presenceHandle = null;
    }
  }

  // ─── Humanized Actions ──────────────────────────────────────────────────────

  async sendTyping(chatId: bigint | string): Promise<void> {
    try {
      const peer = await this.client.getInputEntity(chatId.toString());
      await this.client.invoke(
        new Api.messages.SetTyping({
          peer,
          action: new Api.SendMessageTypingAction(),
        }),
      );
    } catch {}
  }

  async cancelTyping(chatId: bigint | string): Promise<void> {
    try {
      const peer = await this.client.getInputEntity(chatId.toString());
      await this.client.invoke(
        new Api.messages.SetTyping({
          peer,
          action: new Api.SendMessageCancelAction(),
        }),
      );
    } catch {}
  }

  async markRead(chatId: bigint | string, maxId: number): Promise<void> {
    try {
      const peer = await this.client.getInputEntity(chatId.toString());
      await this.client.invoke(
        new Api.messages.ReadHistory({
          peer,
          maxId,
        }),
      );
    } catch {}
  }

  getSessionString(): string {
    return (this.client.session as StringSession).save();
  }

  isConnected(): boolean {
    return this.client.connected;
  }
}

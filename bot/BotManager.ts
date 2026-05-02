import { useEffect } from 'react';
import { Client, LocalAuth as Session, MessageMedia } from 'whatsapp-web.js';
import { initDatabase, getUserSessions, updateSessionQR, updateSessionStatus } from './database';
import { handleMessage, handleGroupJoin, handleGroupLeave } from './handlers/MessageHandler';
import { registerCommands } from './handlers/CommandHandler';

interface BotConfig {
  sessionId: string;
  userId: string;
  phoneNumber: string;
}

export class BotWaveBot {
  private client: Client | null = null;
  private sessionId: string;
  private userId: string;
  private phoneNumber: string;
  private isReady: boolean = false;
  private qrCode: string | null = null;
  private qrTimeout: NodeJS.Timeout | null = null;

  constructor(config: BotConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
  }

  async initialize(): Promise<void> {
    await initDatabase();

    const authDir = `./auth/${this.sessionId}`;

    this.client = new Client({
      authStrategy: new Session({ clientId: this.sessionId }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.setupEventHandlers();

    await this.updateSessionStatus('qr_pending');
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('qr', (qr: string) => {
      this.qrCode = qr;
      this.updateSessionQR(qr);
      console.log(`QR Code generated for session: ${this.sessionId}`);
    });

    this.client.on('authenticated', async () => {
      console.log(`Session authenticated: ${this.sessionId}`);
      await this.updateSessionStatus('active');
    });

    this.client.on('ready', async () => {
      this.isReady = true;
      console.log(`Bot is ready for session: ${this.sessionId}`);
      await this.updateSessionStatus('active');
      registerCommands(this.client!);
    });

    this.client.on('disconnected', async () => {
      this.isReady = false;
      console.log(`Session disconnected: ${this.sessionId}`);
      await this.updateSessionStatus('inactive');
    });

    this.client.on('message', async (message) => {
      await handleMessage(message, this.client!);
    });

    this.client.on('group_join', async (notification) => {
      await handleGroupJoin(notification, this.client!);
    });

    this.client.on('group_leave', async (notification) => {
      await handleGroupLeave(notification, this.client!);
    });
  }

  private async updateSessionQR(qr: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 60 * 1000);
    await updateSessionQR(this.sessionId, qr, expiresAt.toISOString());
  }

  private async updateSessionStatus(status: 'active' | 'inactive' | 'qr_pending'): Promise<void> {
    await updateSessionStatus(this.sessionId, status);
  }

  async start(): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }
    await this.client!.initialize();
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
    }
  }

  getStatus(): { isReady: boolean; qrCode: string | null } {
    return {
      isReady: this.isReady,
      qrCode: this.qrCode,
    };
  }

  async sendMessage(to: string, content: string): Promise<void> {
    if (!this.client || !this.isReady) {
      throw new Error('Bot is not ready');
    }

    const delay = 1000 + Math.random() * 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    await this.client.sendMessage(to, content);
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
    if (!this.client || !this.isReady) {
      throw new Error('Bot is not ready');
    }

    const delay = 1000 + Math.random() * 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const media = await MessageMedia.fromUrl(imageUrl);
    await this.client.sendMessage(to, media, { caption });
  }
}

const activeBots: Map<string, BotWaveBot> = new Map();

export function initializeBot(sessionId?: string, userId?: string, phoneNumber?: string): {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getBot: (sessionId: string) => BotWaveBot | undefined;
} {
  return {
    start: async () => {
      console.log('BotWave bot service started');
    },
    stop: async () => {
      for (const [id, bot] of activeBots) {
        await bot.stop();
      }
      activeBots.clear();
    },
    getBot: (id: string) => activeBots.get(id),
  };
}

export async function createBotSession(
  sessionId: string,
  userId: string,
  phoneNumber: string
): Promise<BotWaveBot> {
  if (activeBots.has(sessionId)) {
    return activeBots.get(sessionId)!;
  }

  const bot = new BotWaveBot({ sessionId, userId, phoneNumber });
  activeBots.set(sessionId, bot);
  await bot.start();

  return bot;
}

export async function destroyBotSession(sessionId: string): Promise<void> {
  const bot = activeBots.get(sessionId);
  if (bot) {
    await bot.stop();
    activeBots.delete(sessionId);
  }
}
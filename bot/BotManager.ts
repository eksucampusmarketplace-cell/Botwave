import { 
  makeWASocket, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { initDatabase, getSessionsNeedingBot, updateSessionQR, updateSessionStatus } from './database';
import { useSupabaseAuthState } from './SupabaseAuthState';
import { handleMessage } from './handlers/MessageHandler';
import { registerCommands } from './handlers/CommandHandler';
import { MessageQueue } from './utils/MessageQueue';
import P from 'pino';

const logger = P({ level: 'info' });

interface BotConfig {
  sessionId: string;
  userId: string;
  phoneNumber: string;
}

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export class BotWaveBot {
  private sessionId: string;
  private userId: string;
  private phoneNumber: string;
  private socket: any = null;
  private isReady: boolean = false;
  private qrCode: string | null = null;
  private reconnectAttempt: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: MessageQueue | null = null;

  constructor(config: BotConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
  }

  private getReconnectDelay(): number {
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_DELAY
    );
    return delay;
  }

  private resetReconnectState() {
    this.reconnectAttempt = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  async start(): Promise<void> {
    const { state, saveCreds } = await useSupabaseAuthState(this.sessionId);
    const { version } = await fetchLatestBaileysVersion();

    this.socket = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      browser: ['BotWave', 'Chrome', '1.0.0'],
    });

    this.messageQueue = new MessageQueue(this.socket, this.sessionId);

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        const expiresAt = new Date(Date.now() + 60 * 1000);
        await updateSessionQR(this.sessionId, qr, expiresAt.toISOString());
        console.log(`QR Code generated for session: ${this.sessionId}`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`Connection closed for session ${this.sessionId}. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`);
        
        this.isReady = false;
        
        if (!shouldReconnect) {
          console.log(`Session ${this.sessionId} logged out or kicked. Updating to needs_reauth.`);
          await updateSessionStatus(this.sessionId, 'needs_reauth');
          
          // Trigger notification
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify/session-down`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: this.sessionId, userId: this.userId }),
            });
          } catch (err) {
            console.error('Failed to send session-down notification:', err);
          }
        } else {
          await updateSessionStatus(this.sessionId, 'inactive');
          this.socket = null;
          const delay = this.getReconnectDelay();
          this.reconnectAttempt++;
          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
          this.reconnectTimeout = setTimeout(() => {
            this.start();
          }, delay);
        }
      } else if (connection === 'open') {
        console.log(`Session connected: ${this.sessionId}`);
        this.isReady = true;
        this.qrCode = null;
        this.resetReconnectState();
        await updateSessionStatus(this.sessionId, 'active');
        registerCommands(this.socket);
      }
    });

    this.socket.ev.on('messages.upsert', async (m: any) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            await handleMessage(msg, this.socket, this.messageQueue);
          }
        }
      }
    });
  }

  async stop(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.end();
      this.socket = null;
      this.isReady = false;
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      qrCode: this.qrCode,
    };
  }
}

const activeBots: Map<string, BotWaveBot> = new Map();

export function initializeBot() {
  return {
    start: async () => {
      await initDatabase();
      console.log('BotWave bot service started');
    },
    stop: async () => {
      for (const [id, bot] of activeBots) {
        await bot.stop();
      }
      activeBots.clear();
    },
  };
}

export async function syncSessionsWithDb() {
  const sessions = await getSessionsNeedingBot();
  
  for (const session of sessions) {
    const bot = activeBots.get(session.id);
    
    if (session.state === 'active' && bot) {
      continue;
    }
    
    if (!bot) {
      console.log(`Starting bot for session: ${session.id}`);
      const newBot = new BotWaveBot({
        sessionId: session.id,
        userId: session.user_id,
        phoneNumber: session.phone_number,
      });
      activeBots.set(session.id, newBot);
      newBot.start().catch(err => console.error(`Failed to start bot ${session.id}:`, err));
    }
  }

  for (const [id, bot] of activeBots) {
    const session = sessions.find(s => s.id === id);
    if (!session) {
      console.log(`Stopping bot for removed session: ${id}`);
      await bot.stop();
      activeBots.delete(id);
    }
  }
}

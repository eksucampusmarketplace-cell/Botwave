import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { initDatabase, getUserSessions, updateSessionQR, updateSessionStatus } from './database';
import { handleMessage } from './handlers/MessageHandler';
import P from 'pino';

const logger = P({ level: 'info' });

interface BotConfig {
  sessionId: string;
  userId: string;
  phoneNumber: string;
}

export class BotWaveBot {
  private sessionId: string;
  private userId: string;
  private phoneNumber: string;
  private socket: any = null;
  private isReady: boolean = false;
  private qrCode: string | null = null;

  constructor(config: BotConfig) {
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.phoneNumber = config.phoneNumber;
  }

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(`./auth/${this.sessionId}`);
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
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`Connection closed for session ${this.sessionId}. Reconnecting: ${shouldReconnect}`);
        this.isReady = false;
        await updateSessionStatus(this.sessionId, 'inactive');
        if (shouldReconnect) {
          this.start();
        }
      } else if (connection === 'open') {
        console.log(`Session connected: ${this.sessionId}`);
        this.isReady = true;
        this.qrCode = null;
        await updateSessionStatus(this.sessionId, 'active');
      }
    });

    this.socket.ev.on('messages.upsert', async (m: any) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            await handleMessage(msg, this.socket);
          }
        }
      }
    });
  }

  async stop(): Promise<void> {
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
  const sessions = await getUserSessions();
  
  for (const session of sessions) {
    if (!activeBots.has(session.id) && (session.state === 'qr_pending' || session.state === 'inactive' || session.state === 'active')) {
      console.log(`Starting bot for session: ${session.id}`);
      const bot = new BotWaveBot({
        sessionId: session.id,
        userId: session.user_id,
        phoneNumber: session.phone_number,
      });
      activeBots.set(session.id, bot);
      bot.start().catch(err => console.error(`Failed to start bot ${session.id}:`, err));
    }
  }
}

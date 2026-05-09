import { WASocket, proto } from '@whiskeysockets/baileys';
import { updateSessionStatus } from '../database';

interface QueuedMessage {
  jid: string;
  content: any;
  options?: any;
  timestamp: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing: boolean = false;
  private socket: any;
  private sessionId: string;
  private lastSendTime: number = 0;
  private connectionDead: boolean = false;
  private consecutiveErrors: number = 0;

  constructor(socket: any, sessionId: string) {
    this.socket = socket;
    this.sessionId = sessionId;
  }

  async enqueue(jid: string, content: any, options?: any) {
    if (this.connectionDead) {
      console.warn(`[QUEUE] ${this.sessionId.slice(0, 8)} — dropping message (connection dead)`);
      return;
    }
    this.queue.push({ jid, content, options, timestamp: Date.now() });
    this.processQueue();
  }

  isConnectionDead(): boolean {
    return this.connectionDead;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      if (this.connectionDead) {
        console.warn(`[QUEUE] ${this.sessionId.slice(0, 8)} — connection dead, flushing ${this.queue.length} queued messages`);
        this.queue = [];
        break;
      }

      const msg = this.queue[0];

      const minDelay = 2000;
      const maxDelay = 5000;
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

      const now = Date.now();
      const timeSinceLastSend = now - this.lastSendTime;

      if (timeSinceLastSend < delay) {
        await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastSend));
      }

      try {
        await this.socket.sendMessage(msg.jid, msg.content, msg.options);
        this.lastSendTime = Date.now();
        this.consecutiveErrors = 0;
        this.queue.shift();
        this.logQueueDepth();
      } catch (error: any) {
        console.error(`Error sending message to ${msg.jid}:`, error);

        const statusCode = error?.output?.statusCode || error?.statusCode;
        const errorMessage = error?.message || '';

        // 428 = Connection Closed by WhatsApp
        // 408 = Request Timeout (stale connection)
        // 440 = Login Timeout
        if (statusCode === 428 || statusCode === 408 || statusCode === 440 ||
            errorMessage.includes('Connection Closed') ||
            errorMessage.includes('Connection was lost')) {
          console.error(`[QUEUE] ${this.sessionId.slice(0, 8)} — FATAL: connection terminated (${statusCode || errorMessage}). Stopping queue and marking session.`);
          this.connectionDead = true;
          this.queue = [];
          this.markSessionNeedsReauth();
          break;
        }

        // No active socket
        if (!this.socket.user) {
          console.error(`[QUEUE] ${this.sessionId.slice(0, 8)} — socket.user gone, stopping queue`);
          this.connectionDead = true;
          this.queue = [];
          break;
        }

        // Consecutive error threshold — if 5 sends fail in a row, connection is likely dead
        this.consecutiveErrors++;
        if (this.consecutiveErrors >= 5) {
          console.error(`[QUEUE] ${this.sessionId.slice(0, 8)} — ${this.consecutiveErrors} consecutive errors, treating as dead connection`);
          this.connectionDead = true;
          this.queue = [];
          this.markSessionNeedsReauth();
          break;
        }

        // Skip this message and continue with next after delay
        this.queue.shift();
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.isProcessing = false;
  }

  private markSessionNeedsReauth() {
    // Use updateSessionStatus for proper regression protection (won't
    // downgrade an active session) and consistent auth_state clearing.
    updateSessionStatus(this.sessionId, 'needs_reauth')
      .then(() => {
        console.log(`[QUEUE] Session ${this.sessionId.slice(0, 8)} marked needs_reauth due to connection failure`);
      })
      .catch((error) => {
        console.error(`[QUEUE] Failed to mark session ${this.sessionId.slice(0, 8)} needs_reauth:`, error);
      });
  }

  private logQueueDepth() {
    if (this.queue.length > 0) {
      console.log(`[QUEUE] Session ${this.sessionId.slice(0, 8)} depth: ${this.queue.length}`);
    }
  }
}

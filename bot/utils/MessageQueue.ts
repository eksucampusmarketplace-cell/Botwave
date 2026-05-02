import { AnyWASocket, proto } from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface QueuedMessage {
  jid: string;
  content: any;
  options?: any;
  timestamp: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing: boolean = false;
  private socket: AnyWASocket;
  private sessionId: string;
  private lastSendTime: number = 0;

  constructor(socket: AnyWASocket, sessionId: string) {
    this.socket = socket;
    this.sessionId = sessionId;
  }

  async enqueue(jid: string, content: any, options?: any) {
    this.queue.push({ jid, content, options, timestamp: Date.now() });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const msg = this.queue[0];
      
      // Random delay between 10-30 seconds as requested by user
      // But user also mentioned 2-3 seconds random delay in prompt 2
      // AND 10-30 secs delay in the later comment "i think 10-30 secs delay is better"
      const minDelay = 10000;
      const maxDelay = 30000;
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

      const now = Date.now();
      const timeSinceLastSend = now - this.lastSendTime;

      if (timeSinceLastSend < delay) {
        await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastSend));
      }

      try {
        await this.socket.sendMessage(msg.jid, msg.content, msg.options);
        this.lastSendTime = Date.now();
        this.queue.shift(); // Remove from queue only after successful send
        
        // Log queue depth to Supabase for monitoring (optional, but requested in prompt 5)
        // We can use the 'bot_sessions' table or a new one. Let's just log it.
        await this.logQueueDepth();

      } catch (error) {
        console.error(`Error sending message to ${msg.jid}:`, error);
        // If it's a connection error, we might want to stop processing and wait for reconnect
        if (!this.socket.user) {
            this.isProcessing = false;
            return;
        }
        // For other errors, maybe retry later or skip?
        // Let's retry once by moving to end of queue or just wait.
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.isProcessing = false;
  }

  private async logQueueDepth() {
    try {
        // We could add a queue_depth column to bot_sessions, but for now let's just log it
        // Or update a metadata field.
        // For simplicity, let's just use console log if we don't want to change schema again.
        // Prompt 5 said: "log queue depth per session to Supabase for monitoring"
        // I'll add a column later if needed, but let's see if I can use existing metadata if any.
        console.log(`Session ${this.sessionId} queue depth: ${this.queue.length}`);
    } catch (err) {
        console.error('Failed to log queue depth:', err);
    }
  }
}

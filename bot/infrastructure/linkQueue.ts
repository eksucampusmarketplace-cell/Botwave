import { is428CooldownActive, get428CooldownRemaining } from '../whatsapp/evolution/client';

const DELAY_MS = 5_000; // 5s gap between Baileys pairing requests (avoids 428)

interface LinkJob {
  sessionId: string;
  phoneNumber: string;
  resolve: (code: string) => void;
  reject: (err: Error) => void;
  requestPairingCode: (phone: string) => Promise<string>;
  queuedAt: number;
}

const queue: LinkJob[] = [];
let processing = false;

export async function queueLink(
  sessionId: string,
  phoneNumber: string,
  requestPairingCode: (phone: string) => Promise<string>,
): Promise<string> {
  const queuedAt = Date.now();
  console.log(`[PAIRING-QUEUE] Job queued: session=${sessionId} phone=${phoneNumber} queueLen=${queue.length} processing=${processing} at=${new Date(queuedAt).toISOString()}`);
  return new Promise((resolve, reject) => {
    queue.push({ sessionId, phoneNumber, resolve, reject, requestPairingCode, queuedAt });
    if (!processing) processQueue();
  });
}

async function processQueue() {
  processing = true;
  console.log(`[PAIRING-QUEUE] Processing started. queueLen=${queue.length}`);
  while (queue.length > 0) {
    // Respect 428 cooldown before attempting any pairing request
    if (is428CooldownActive()) {
      const remaining = get428CooldownRemaining() * 1000;
      console.log(`[PAIRING-QUEUE] 428 cooldown active, waiting ${Math.ceil(remaining / 1000)}s`);
      await new Promise(r => setTimeout(r, remaining + 1000));
    }

    const job = queue.shift()!;
    const waitTime = Date.now() - job.queuedAt;
    console.log(`[PAIRING-QUEUE] Processing job: session=${job.sessionId} phone=${job.phoneNumber} waitedInQueue=${waitTime}ms remainingJobs=${queue.length}`);
    try {
      const jobStart = Date.now();
      const code = await job.requestPairingCode(job.phoneNumber);
      const jobDuration = Date.now() - jobStart;
      console.log(`[PAIRING-QUEUE] Job completed: session=${job.sessionId} code="${code}" duration=${jobDuration}ms totalWait=${Date.now() - job.queuedAt}ms`);
      job.resolve(code);
    } catch (err: any) {
      console.error(`[PAIRING-QUEUE] Job FAILED: session=${job.sessionId} error=${err?.message} totalWait=${Date.now() - job.queuedAt}ms`);
      job.reject(err as Error);
    }
    if (queue.length > 0) {
      console.log(`[PAIRING-QUEUE] Waiting ${DELAY_MS / 1000}s before next job (${queue.length} remaining)...`);
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  console.log(`[PAIRING-QUEUE] Queue empty. Processing stopped.`);
  processing = false;
}

/**
 * Cancel all pending (queued but not yet processing) link jobs for a session.
 * In-flight jobs (already calling requestPairingCode) cannot be cancelled here;
 * the caller must guard against stale results via a socket/state check.
 */
export function cancelPendingLinks(sessionId: string): void {
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].sessionId === sessionId) {
      const job = queue.splice(i, 1)[0];
      job.reject(new Error('SESSION_TERMINATED'));
    }
  }
}

export function getQueuePosition(sessionId: string): { position: number; estimatedWaitMinutes: number } | null {
  const pos = queue.findIndex(j => j.sessionId === sessionId);
  if (pos === -1) return null;
  const waitMins = (pos + 1) * 3;
  return { position: pos + 1, estimatedWaitMinutes: waitMins };
}

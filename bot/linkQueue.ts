const DELAY_MS = 3 * 60 * 1000; // 3 minutes between links

interface LinkJob {
  sessionId: string;
  phoneNumber: string;
  resolve: (code: string) => void;
  reject: (err: Error) => void;
  requestPairingCode: (phone: string) => Promise<string>;
}

const queue: LinkJob[] = [];
let processing = false;

export async function queueLink(
  sessionId: string,
  phoneNumber: string,
  requestPairingCode: (phone: string) => Promise<string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    queue.push({ sessionId, phoneNumber, resolve, reject, requestPairingCode });
    if (!processing) processQueue();
  });
}

async function processQueue() {
  processing = true;
  while (queue.length > 0) {
    const job = queue.shift()!;
    try {
      const code = await job.requestPairingCode(job.phoneNumber);
      job.resolve(code);
    } catch (err) {
      job.reject(err as Error);
    }
    if (queue.length > 0) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
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

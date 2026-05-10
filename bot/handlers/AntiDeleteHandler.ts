import { downloadMediaMessage as baileysDownloadMedia } from '@whiskeysockets/baileys';
import { getFeatureEnabled } from '../database';

const CACHE_MAX_PER_SESSION = 500;
const CACHE_CLEANUP_AT = 600;
const RECOVER_WINDOW_MS = 10 * 60 * 1000;

interface CachedMessage {
  senderJid: string;
  pushName: string;
  chatJid: string;
  content: string | null;
  mediaType: 'image' | 'video' | 'audio' | 'sticker' | 'document' | null;
  mediaCaption: string | null;
  mediaBuffer: Buffer | null;
  mediaMimetype: string | null;
  timestamp: number;
}

interface DeletedMessage extends CachedMessage {
  deletedAt: number;
  deleterJid: string;
  deleterName: string;
}

// sessionId → msgId → CachedMessage
const messageCache = new Map<string, Map<string, CachedMessage>>();
// sessionId → chatJid → DeletedMessage[]
const deletedCache = new Map<string, Map<string, DeletedMessage[]>>();

function getSessionMsgCache(sessionId: string): Map<string, CachedMessage> {
  let cache = messageCache.get(sessionId);
  if (!cache) {
    cache = new Map();
    messageCache.set(sessionId, cache);
  }
  return cache;
}

function getSessionDeletedCache(sessionId: string): Map<string, DeletedMessage[]> {
  let cache = deletedCache.get(sessionId);
  if (!cache) {
    cache = new Map();
    deletedCache.set(sessionId, cache);
  }
  return cache;
}

function evictOldest(cache: Map<string, CachedMessage>): void {
  if (cache.size < CACHE_CLEANUP_AT) return;
  const entries = Array.from(cache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = entries.slice(0, entries.length - CACHE_MAX_PER_SESSION);
  for (const [key] of toRemove) {
    cache.delete(key);
  }
}

function pruneExpiredDeleted(list: DeletedMessage[]): DeletedMessage[] {
  const cutoff = Date.now() - RECOVER_WINDOW_MS;
  return list.filter((m) => m.deletedAt > cutoff);
}

function extractMediaInfo(msg: any): {
  mediaType: CachedMessage['mediaType'];
  mediaCaption: string | null;
  mediaMimetype: string | null;
} {
  const message = msg?.message;
  if (!message) return { mediaType: null, mediaCaption: null, mediaMimetype: null };

  if (message.imageMessage) {
    return {
      mediaType: 'image',
      mediaCaption: message.imageMessage.caption || null,
      mediaMimetype: message.imageMessage.mimetype || 'image/jpeg',
    };
  }
  if (message.videoMessage) {
    return {
      mediaType: 'video',
      mediaCaption: message.videoMessage.caption || null,
      mediaMimetype: message.videoMessage.mimetype || 'video/mp4',
    };
  }
  if (message.audioMessage) {
    return {
      mediaType: 'audio',
      mediaCaption: null,
      mediaMimetype: message.audioMessage.mimetype || 'audio/ogg; codecs=opus',
    };
  }
  if (message.stickerMessage) {
    return {
      mediaType: 'sticker',
      mediaCaption: null,
      mediaMimetype: message.stickerMessage.mimetype || 'image/webp',
    };
  }
  if (message.documentMessage) {
    return {
      mediaType: 'document',
      mediaCaption: message.documentMessage.caption || message.documentMessage.fileName || null,
      mediaMimetype: message.documentMessage.mimetype || 'application/octet-stream',
    };
  }

  return { mediaType: null, mediaCaption: null, mediaMimetype: null };
}

async function tryDownloadMedia(msg: any): Promise<Buffer | null> {
  try {
    const buffer = await baileysDownloadMedia(msg, 'buffer', {});
    if (buffer) return Buffer.from(buffer);
  } catch {
    // Media download is best-effort
  }
  return null;
}

function normalizeJid(jid: string): string {
  if (!jid) return jid;
  return jid.replace(/:\d+@/, '@').trim();
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function cacheMessage(
  sessionId: string,
  message: any,
): Promise<void> {
  const msgId = message.key?.id;
  if (!msgId) return;

  const chatJid = message.key.remoteJid;
  if (!chatJid || chatJid === 'status@broadcast') return;

  const content =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    '';

  const { mediaType, mediaCaption, mediaMimetype } = extractMediaInfo(message);

  if (!content && !mediaType) return;

  const rawParticipant = message.key.participant;
  const participantPn = (message.key as any).participantPn;
  const senderJid = normalizeJid(participantPn || rawParticipant || chatJid);

  let mediaBuffer: Buffer | null = null;
  if (mediaType) {
    mediaBuffer = await tryDownloadMedia(message);
  }

  const cache = getSessionMsgCache(sessionId);
  cache.set(msgId, {
    senderJid,
    pushName: message.pushName || 'Someone',
    chatJid,
    content: content || null,
    mediaType,
    mediaCaption,
    mediaBuffer,
    mediaMimetype,
    timestamp: Date.now(),
  });

  evictOldest(cache);
}

export async function handleMessageRevoke(
  revokeMessage: any,
  sessionId: string,
  userId: string,
): Promise<void> {
  const protocolMsg = revokeMessage.message?.protocolMessage;
  if (!protocolMsg || protocolMsg.type !== 0) return;

  const deletedKey = protocolMsg.key;
  if (!deletedKey?.id) return;

  try {
    const enabled = await getFeatureEnabled(userId, 'anti_delete');
    if (!enabled) return;
  } catch {
    return;
  }

  const msgCache = getSessionMsgCache(sessionId);
  const cached = msgCache.get(deletedKey.id);
  if (!cached) {
    console.log(`[ANTI-DELETE] Revoke for ${deletedKey.id} — message NOT in cache (session=${sessionId.slice(0, 8)}). Cache size=${msgCache.size}`);
    return;
  }

  console.log(`[ANTI-DELETE] Revoke for ${deletedKey.id} — found cached message in chat=${cached.chatJid} from=${cached.senderJid} revokeJid=${revokeMessage.key.remoteJid}`);
  msgCache.delete(deletedKey.id);

  // Use the cached chatJid (phone JID format) instead of revokeMessage.key.remoteJid
  // which may be a LID format (e.g. 254267029979336@lid).  The !recover command
  // looks up by context.chatJid which is always the phone JID, so the keys must match.
  const chatJid = cached.chatJid || revokeMessage.key.remoteJid;
  const revokerParticipant = revokeMessage.key.participant;
  const revokerPn = (revokeMessage.key as any).participantPn;
  const deleterJid = normalizeJid(revokerPn || revokerParticipant || revokeMessage.key.remoteJid || '');
  const deleterName = cached.pushName;

  const delCache = getSessionDeletedCache(sessionId);
  let chatDeleted = delCache.get(chatJid) || [];
  chatDeleted = pruneExpiredDeleted(chatDeleted);

  chatDeleted.push({
    ...cached,
    deletedAt: Date.now(),
    deleterJid,
    deleterName,
  });

  delCache.set(chatJid, chatDeleted);
}

export interface RecoveredMessage {
  deleterJid: string;
  deleterName: string;
  content: string | null;
  mediaType: CachedMessage['mediaType'];
  mediaCaption: string | null;
  mediaBuffer: Buffer | null;
  mediaMimetype: string | null;
  deletedAt: number;
  originalTimestamp: number;
}

export function getDeletedMessages(sessionId: string, chatJid: string): RecoveredMessage[] {
  const delCache = getSessionDeletedCache(sessionId);
  console.log(`[ANTI-DELETE] getDeletedMessages: session=${sessionId.slice(0, 8)} chatJid=${chatJid} cachedChats=[${Array.from(delCache.keys()).join(', ')}]`);
  let chatDeleted = delCache.get(chatJid) || [];

  // Fallback: if no results for the phone JID, check if there are results
  // stored under a LID key whose cached messages originated from this chatJid.
  if (chatDeleted.length === 0) {
    for (const [key, msgs] of delCache.entries()) {
      if (key !== chatJid && msgs.some((m) => m.chatJid === chatJid)) {
        chatDeleted = [...chatDeleted, ...msgs.filter((m) => m.chatJid === chatJid)];
      }
    }
  }

  chatDeleted = pruneExpiredDeleted(chatDeleted);
  delCache.set(chatJid, chatDeleted);

  return chatDeleted.map((m) => ({
    deleterJid: m.deleterJid,
    deleterName: m.deleterName,
    content: m.content,
    mediaType: m.mediaType,
    mediaCaption: m.mediaCaption,
    mediaBuffer: m.mediaBuffer,
    mediaMimetype: m.mediaMimetype,
    deletedAt: m.deletedAt,
    originalTimestamp: m.timestamp,
  }));
}

export function clearRecoveredMessages(sessionId: string, chatJid: string): void {
  const delCache = getSessionDeletedCache(sessionId);
  delCache.delete(chatJid);
}

export function cleanupSessionCache(sessionId: string): void {
  messageCache.delete(sessionId);
  deletedCache.delete(sessionId);
}

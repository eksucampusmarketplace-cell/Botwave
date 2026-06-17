import nodemailer from 'nodemailer';
import type { EmailChannel } from './types';
import { CHANNEL_CONFIG } from './types';
import { getNextSender, getSenderForChannel, type SenderIdentity } from './rotation';

const transporters = new Map<string, nodemailer.Transporter>();

const SMTP_HOST = process.env.POSTAL_SMTP_HOST || process.env.SMTP_HOST || 'postal.botwave.online';
const SMTP_PORT = parseInt(process.env.POSTAL_SMTP_PORT || process.env.SMTP_PORT || '25', 10);

export function getTransporter(channel: EmailChannel): nodemailer.Transporter {
  const cached = transporters.get(channel);
  if (cached) return cached;

  const config = CHANNEL_CONFIG[channel];
  const [user, pass] = config.smtpUser.split('/');

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateLimit: 10,
  });

  transporters.set(channel, transport);
  return transport;
}

/**
 * Get the next rotated sender identity.
 * Uses the in-memory round-robin pool for maximum speed.
 */
export function getRotatedSender(): SenderIdentity {
  return getNextSender();
}

/**
 * Get a sender identity matching a specific channel, with rotation fallback.
 */
export function getChannelSender(channel: string): SenderIdentity {
  return getSenderForChannel(channel);
}

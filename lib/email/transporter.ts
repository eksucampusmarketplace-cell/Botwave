import nodemailer from 'nodemailer';
import type { EmailChannel } from './types';
import { CHANNEL_CONFIG } from './types';

const transporters = new Map<EmailChannel, nodemailer.Transporter>();

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

export type EmailChannel = 'auth' | 'notify' | 'billing' | 'welcome' | 'alerts' | 'usermail';

export interface EmailEnvelope {
  channel: EmailChannel;
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromAddress?: string;
  replyTo?: string;
}

export interface QueuedEmail extends EmailEnvelope {
  id: string;
  attempts: number;
  createdAt: string;
  lastError?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// All channels route through mail.botwave.online (only verified Postal domain).
// Different fromName per channel for branding; same domain + credential.
const VERIFIED_DOMAIN = 'mail.botwave.online';
const VERIFIED_SMTP_USER = 'UserMail/4n5ch0PAlOlVgnqFbuwGrUtQ';

export const CHANNEL_CONFIG: Record<EmailChannel, {
  domain: string;
  defaultFrom: string;
  defaultFromName: string;
  smtpUser: string;
}> = {
  auth: {
    domain: VERIFIED_DOMAIN,
    defaultFrom: `noreply@${VERIFIED_DOMAIN}`,
    defaultFromName: 'BotWave Security',
    smtpUser: VERIFIED_SMTP_USER,
  },
  notify: {
    domain: VERIFIED_DOMAIN,
    defaultFrom: `alerts@${VERIFIED_DOMAIN}`,
    defaultFromName: 'BotWave Alerts',
    smtpUser: VERIFIED_SMTP_USER,
  },
  billing: {
    domain: VERIFIED_DOMAIN,
    defaultFrom: `billing@${VERIFIED_DOMAIN}`,
    defaultFromName: 'BotWave Billing',
    smtpUser: VERIFIED_SMTP_USER,
  },
  welcome: {
    domain: VERIFIED_DOMAIN,
    defaultFrom: `hello@${VERIFIED_DOMAIN}`,
    defaultFromName: 'BotWave',
    smtpUser: VERIFIED_SMTP_USER,
  },
  alerts: {
    domain: VERIFIED_DOMAIN,
    defaultFrom: `alerts@${VERIFIED_DOMAIN}`,
    defaultFromName: 'BotWave Alerts',
    smtpUser: VERIFIED_SMTP_USER,
  },
  usermail: {
    domain: VERIFIED_DOMAIN,
    defaultFrom: `noreply@${VERIFIED_DOMAIN}`,
    defaultFromName: 'BotWave Mail',
    smtpUser: VERIFIED_SMTP_USER,
  },
};

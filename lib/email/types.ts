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

export const CHANNEL_CONFIG: Record<EmailChannel, {
  domain: string;
  defaultFrom: string;
  defaultFromName: string;
  smtpUser: string;
}> = {
  auth: {
    domain: 'auth.botwave.online',
    defaultFrom: 'noreply@auth.botwave.online',
    defaultFromName: 'BotWave Security',
    smtpUser: 'Auth/nIPpFdSQO0wX1dQdLD4yiiYD',
  },
  notify: {
    domain: 'notify.botwave.online',
    defaultFrom: 'alerts@notify.botwave.online',
    defaultFromName: 'BotWave Alerts',
    smtpUser: 'Notifications/MtLgQKXv34kATRpvkFl2qbfK',
  },
  billing: {
    domain: 'billing.botwave.online',
    defaultFrom: 'noreply@billing.botwave.online',
    defaultFromName: 'BotWave Billing',
    smtpUser: 'Billing/W0TppJvOifqNkxIlC5b642h9',
  },
  welcome: {
    domain: 'welcome.botwave.online',
    defaultFrom: 'hello@welcome.botwave.online',
    defaultFromName: 'BotWave',
    smtpUser: 'Welcome/1UJBCPiCp3d1MjBghZR6oDs7',
  },
  alerts: {
    domain: 'botwave.online',
    defaultFrom: 'alerts@botwave.online',
    defaultFromName: 'BotWave Alerts',
    smtpUser: 'Alerts/UPaLwkanpZoTEY7XKT2JoQsM',
  },
  usermail: {
    domain: 'mail.botwave.online',
    defaultFrom: 'noreply@mail.botwave.online',
    defaultFromName: 'BotWave Mail',
    smtpUser: 'UserMail/4n5ch0PAlOlVgnqFbuwGrUtQ',
  },
};

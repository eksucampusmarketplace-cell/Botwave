import { landingPages as _all } from './data';

const WA_USERBOT_RE = /whatsapp|userbot/i;

export const landingPages = _all.filter(p => !WA_USERBOT_RE.test(p.slug));

export type { LandingPage } from './data';

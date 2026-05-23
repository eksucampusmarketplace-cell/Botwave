/**
 * /tycoon — Cosa Nostra Tycoon coming-soon lander.
 *
 * §33.2 Day 3-7 ("validate distribution before building"). This page
 * exists so we can drop a link into Botwave bot DMs / partner DMs and
 * count the tap-through and signup rate *before* the V1 backend ships.
 *
 * Behaviour:
 *   - Server picks the theme variant from the `?v=` query param if
 *     present, otherwise the `tycoon_theme` cookie, otherwise a stable
 *     50/50 bucket keyed on the request's IP /24. Cookie is set on the
 *     response so the variant is sticky for the same visitor.
 *   - The page is fully server-rendered shell + a small client form. No
 *     extra JS on the critical path.
 *   - Signup posts to /api/tycoon/signup; page-view beacons to
 *     /api/tycoon/event.
 *
 * Out of scope here: actual game frontend (that lives at /miniapp/tycoon-
 * mockup.html and is wired up in a separate PR), partner DM tooling
 * (separate PR), backend foundation (separate PR).
 */

import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { TycoonLanderClient } from './LanderClient';

export const dynamic = 'force-dynamic';

type ThemeVariant = 'cosa-nostra' | 'neutral';

const THEMES: Record<ThemeVariant, ThemeContent> = {
  'cosa-nostra': {
    eyebrow: 'A Telegram Mini App',
    title: 'Cosa Nostra Tycoon',
    tagline: 'Run your crew. Raid rivals. Take the city.',
    pitch: [
      'Build a hideout, train shooters and bikers, and send your family on raids.',
      'No download. No store. One tap from any Telegram chat.',
    ],
    cta: 'Join the family',
    bg: 'from-zinc-950 via-red-950/40 to-zinc-950',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-400 text-zinc-950 hover:bg-amber-300',
    bullet: '🎩',
  },
  neutral: {
    eyebrow: 'A Telegram Mini App',
    title: 'Hustle City',
    tagline: 'Build your crew. Raid rivals. Run the streets.',
    pitch: [
      'Build a hideout, train fighters, and send your crew on raids.',
      'No download. No store. One tap from any Telegram chat.',
    ],
    cta: 'Get on the list',
    bg: 'from-zinc-950 via-emerald-950/40 to-zinc-950',
    accent: 'text-emerald-400',
    accentBg: 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300',
    bullet: '⚡',
  },
};

type ThemeContent = {
  eyebrow: string;
  title: string;
  tagline: string;
  pitch: string[];
  cta: string;
  bg: string;
  accent: string;
  accentBg: string;
  bullet: string;
};

export const metadata: Metadata = {
  title: 'Cosa Nostra Tycoon — coming soon',
  description:
    'A free Telegram Mini App game. Run your crew, raid rivals, take the city. Drop your @ to be notified at launch.',
  openGraph: {
    title: 'Cosa Nostra Tycoon — coming soon',
    description: 'A free Telegram Mini App game. Drop your @ to be notified at launch.',
    type: 'website',
    url: 'https://www.botwave.online/tycoon',
  },
  alternates: { canonical: '/tycoon' },
  // Keep the lander out of search indexing while it's still pre-launch.
  robots: { index: false, follow: false },
};

function pickVariantFromQuery(value: string | undefined): ThemeVariant | null {
  if (value === 'cn' || value === 'cosa-nostra' || value === 'a') return 'cosa-nostra';
  if (value === 'n' || value === 'neutral' || value === 'hustle-city' || value === 'b') return 'neutral';
  return null;
}

function bucketFromIp(ip: string | null): ThemeVariant {
  if (!ip) return 'cosa-nostra';
  // Stable hash so the same /24 always gets the same bucket.
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) | 0;
  return (h & 1) === 0 ? 'cosa-nostra' : 'neutral';
}

export default async function TycoonLanderPage({
  searchParams,
}: {
  searchParams?: Promise<{ v?: string; src?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const fromQuery = pickVariantFromQuery(sp.v);

  const cookieStore = await cookies();
  const headerList = await headers();
  const ipHeader = headerList.get('x-forwarded-for') || headerList.get('x-real-ip') || '';
  const ipFirst = ipHeader.split(',')[0]?.trim() || null;

  const cookieVariant = cookieStore.get('tycoon_theme')?.value as
    | ThemeVariant
    | undefined;

  const variant: ThemeVariant =
    fromQuery ?? cookieVariant ?? bucketFromIp(ipFirst);

  const theme = THEMES[variant];
  const source = (sp.src || '').slice(0, 64) || null;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.bg} text-zinc-100`}>
      <div className="mx-auto max-w-3xl px-5 pt-12 pb-24 sm:pt-20">
        <header className="mb-10 sm:mb-14">
          <div className={`mb-3 text-xs uppercase tracking-[0.18em] ${theme.accent}`}>
            {theme.eyebrow}
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            {theme.title}
          </h1>
          <p className="mt-4 text-lg sm:text-2xl text-zinc-300">{theme.tagline}</p>
        </header>

        <section className="mb-12 space-y-3 text-zinc-300 sm:text-lg leading-relaxed">
          {theme.pitch.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        <ScreenshotStrip accent={theme.accent} />

        <section className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: theme.bullet,
              h: 'Zero install',
              p: 'Opens in 2 seconds from any Telegram chat.',
            },
            {
              icon: '⚔️',
              h: 'Real raids',
              p: 'Combat math is server-resolved. Your gear and crew composition decide it.',
            },
            {
              icon: '👥',
              h: 'Your group = your family',
              p: 'The Telegram group you already chat in is your war room. No new app to convince anyone to install.',
            },
          ].map((f) => (
            <div
              key={f.h}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold mb-1">{f.h}</div>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.p}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-1">{theme.cta}</h2>
          <p className="text-zinc-400 text-sm mb-5">
            Drop your Telegram <span className={theme.accent}>@</span> and we&apos;ll
            DM you the moment the bot opens. Email is optional.
          </p>
          <TycoonLanderClient
            variant={variant}
            source={source}
            accentBg={theme.accentBg}
            accent={theme.accent}
          />
          <p className="text-xs text-zinc-500 mt-3">
            No spam. One DM at launch, then nothing unless you opt in.
          </p>
        </section>

        <footer className="mt-20 text-xs text-zinc-500">
          A free game from{' '}
          <a className="underline hover:text-zinc-300" href="/">
            Botwave
          </a>
          . By signing up you agree to the{' '}
          <a className="underline hover:text-zinc-300" href="/privacy">
            privacy policy
          </a>
          .
        </footer>
      </div>
    </div>
  );
}

/**
 * Three placeholder screenshot frames. The real screenshots get added once
 * we capture them off `/miniapp/tycoon-mockup.html` in PR-A2. Until then
 * these are stylised placeholders so the page still looks like a real
 * pre-launch lander.
 */
function ScreenshotStrip({ accent }: { accent: string }) {
  const frames = [
    { label: 'Hideout', emoji: '🏚️' },
    { label: 'Army', emoji: '🪖' },
    { label: 'Raid', emoji: '⚔️' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {frames.map((f) => (
        <div
          key={f.label}
          className="aspect-[9/16] rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center text-zinc-500"
          aria-label={`${f.label} screenshot placeholder`}
        >
          <div className="text-4xl sm:text-5xl mb-2">{f.emoji}</div>
          <div className={`text-xs uppercase tracking-wider ${accent}`}>{f.label}</div>
        </div>
      ))}
    </div>
  );
}

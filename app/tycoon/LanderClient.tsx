'use client';

/**
 * Signup form for the /tycoon coming-soon lander.
 *
 * Posts to /api/tycoon/signup, fires a view beacon to /api/tycoon/event
 * on mount, and reflects success/duplicate/error states inline. Tries
 * extra hard to accept Telegram handles in any common shape (`@foo`,
 * `foo`, `t.me/foo`, `https://t.me/foo/`).
 */

import { useEffect, useId, useRef, useState } from 'react';

type Variant = 'cosa-nostra' | 'neutral';

const TG_USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeTg(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^https?:\/\/(t\.me|telegram\.me|telegram\.dog)\//i, '');
  s = s.replace(/^@+/, '');
  s = s.replace(/\/.*$/, '');
  return s;
}

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; deduped: boolean }
  | { kind: 'error'; message: string };

export function TycoonLanderClient({
  variant,
  source,
  accentBg,
  accent,
}: {
  variant: Variant;
  source: string | null;
  accentBg: string;
  accent: string;
}) {
  const usernameId = useId();
  const emailId = useId();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const viewLogged = useRef(false);

  // Persist the chosen variant in a cookie so the user keeps the same
  // theme on subsequent visits.
  useEffect(() => {
    document.cookie = `tycoon_theme=${variant}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
  }, [variant]);

  // Stable per-browser client id for view-dedup analytics (NOT a tracking
  // identifier across origins; just localStorage).
  useEffect(() => {
    if (viewLogged.current) return;
    viewLogged.current = true;
    let clientId = '';
    try {
      clientId = localStorage.getItem('tycoon_cid') || '';
      if (!clientId) {
        clientId = `cid_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
        localStorage.setItem('tycoon_cid', clientId);
      }
    } catch {
      // localStorage might be blocked; just skip the dedup.
    }
    fetch('/api/tycoon/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'view',
        theme_variant: variant,
        source,
        client_id: clientId,
        meta: {
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        },
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [variant, source]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === 'submitting') return;

    const normalizedTg = username ? normalizeTg(username) : '';
    const trimmedEmail = email.trim();

    if (!normalizedTg && !trimmedEmail) {
      setState({ kind: 'error', message: 'Enter your Telegram @ or an email.' });
      return;
    }
    if (normalizedTg && !TG_USERNAME_RE.test(normalizedTg)) {
      setState({
        kind: 'error',
        message: 'That Telegram handle looks off — should be 5-32 chars, letters/numbers/_.',
      });
      return;
    }
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      setState({ kind: 'error', message: "That email doesn't look right." });
      return;
    }

    setState({ kind: 'submitting' });
    try {
      const res = await fetch('/api/tycoon/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_username: normalizedTg || undefined,
          email: trimmedEmail || undefined,
          theme_variant: variant,
          source: source || undefined,
          meta: {
            referrer: document.referrer || null,
            ua: navigator.userAgent.slice(0, 160),
          },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        deduped?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setState({
          kind: 'error',
          message: json.error
            ? `Signup failed: ${json.error.replace(/_/g, ' ')}.`
            : 'Signup failed. Try again in a moment.',
        });
        return;
      }
      setState({ kind: 'success', deduped: Boolean(json.deduped) });
    } catch {
      setState({
        kind: 'error',
        message: 'Network error. Check your connection and try again.',
      });
    }
  }

  if (state.kind === 'success') {
    return (
      <div
        className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5"
        role="status"
        aria-live="polite"
      >
        <div className={`text-lg font-semibold mb-1 ${accent}`}>
          {state.deduped ? "You're already on the list." : "You're in."}
        </div>
        <p className="text-sm text-zinc-400">
          We'll DM you the moment the bot opens. Until then,{' '}
          <a className="underline hover:text-zinc-200" href="/">
            check out Botwave
          </a>{' '}
          — the same team.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label
          htmlFor={usernameId}
          className="block text-xs uppercase tracking-wider text-zinc-400 mb-1"
        >
          Telegram handle
        </label>
        <div className="flex items-stretch rounded-xl border border-zinc-800/80 bg-zinc-900/60 focus-within:border-zinc-600">
          <span className="px-3 flex items-center text-zinc-500 text-lg">@</span>
          <input
            id={usernameId}
            type="text"
            inputMode="text"
            autoCapitalize="off"
            autoComplete="username"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourhandle"
            className="flex-1 bg-transparent py-3 pr-3 outline-none text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={emailId}
          className="block text-xs uppercase tracking-wider text-zinc-400 mb-1"
        >
          Email <span className="text-zinc-600">(optional)</span>
        </label>
        <input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/60 py-3 px-3 outline-none text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600"
        />
      </div>

      {state.kind === 'error' && (
        <div className="text-sm text-red-400" role="alert" aria-live="polite">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={state.kind === 'submitting'}
        className={`w-full rounded-xl font-semibold py-3 px-4 transition ${accentBg} disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {state.kind === 'submitting' ? 'Saving…' : 'Notify me at launch'}
      </button>
    </form>
  );
}

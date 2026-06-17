

/**
 * SessionHealthBadge
 *
 * Tiny inline badge mounted inside SessionCard. Fetches /api/bot/sessions/[id]/health
 * once when the card mounts and shows:
 *   - The proxy IP the session is currently bound to (shared-pool or custom),
 *     or "no proxy" if the session is going direct from server IP
 *   - The disconnect count in the last 24h, colour-coded green/yellow/red
 *
 * Works uniformly across telegram_bot / telegram_userbot — the
 * health endpoint is platform-agnostic because bot_sessions and
 * bot_health_events are too.
 *
 * Failure mode: if the fetch fails (e.g. endpoint down, RLS denial) the badge
 * just doesn't render. It never blocks the rest of the card.
 */
import { useEffect, useState } from 'react';

interface HealthResponse {
  sessionId: string;
  proxy: {
    type: 'shared' | 'custom';
    host: string | null;
    lastAssigned: string | null;
  };
  health: {
    disconnectCount24h: number;
    errorCount24h: number;
    lastDisconnect: { at: string; details: string | null } | null;
    lastPairingError: string | null;
  };
}

interface Props {
  sessionId: string;
}

export default function SessionHealthBadge({ sessionId }: Props) {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/bot/sessions/${sessionId}/health`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (!cancelled && json) setData(json);
      })
      .catch(() => {
        // Silent fail — badge just won't render
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading || !data) return null;

  const disconnects = data.health.disconnectCount24h;
  const hasProxy = !!data.proxy.host;

  // Colour by disconnect frequency: 0 = green, 1-2 = yellow, 3+ = red
  const healthColour =
    disconnects === 0
      ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20'
      : disconnects <= 2
        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20';

  // Proxy badge: green if pinned, grey if going direct (server IP).
  // Going direct is a meaningful warning when scaling beyond 1 session
  // as Telegram may rate-limit by IP for high-volume userbot sessions.
  const proxyColour = hasProxy
    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
    : 'bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-500/20';

  const proxyLabel = hasProxy
    ? data.proxy.type === 'custom'
      ? `BYOP ${data.proxy.host}`
      : data.proxy.host
    : 'no proxy';

  const disconnectsTitle = data.health.lastDisconnect
    ? `Last disconnect: ${new Date(data.health.lastDisconnect.at).toLocaleString()}${
        data.health.lastDisconnect.details ? ` — ${data.health.lastDisconnect.details}` : ''
      }`
    : 'No disconnects in last 24h';

  const proxyTitle = data.proxy.lastAssigned
    ? `Assigned ${new Date(data.proxy.lastAssigned).toLocaleString()}`
    : hasProxy
      ? 'Proxy bound this session'
      : 'Session is connecting from the server IP — at high disconnect risk if you have multiple sessions';

  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <span
        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${proxyColour}`}
        title={proxyTitle}
      >
        {proxyLabel}
      </span>
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${healthColour}`}
        title={disconnectsTitle}
      >
        {disconnects}× 24h
      </span>
    </div>
  );
}

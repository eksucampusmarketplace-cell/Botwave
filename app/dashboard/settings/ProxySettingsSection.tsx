'use client';

import { useEffect, useState } from 'react';

interface SessionRow {
  id: string;
  session_name: string;
  platform?: string;
  proxy_type?: 'shared' | 'custom' | null;
  proxy_host?: string | null;
  proxy_port?: string | null;
  proxy_username?: string | null;
}

interface ProxyDraft {
  host: string;
  port: string;
  username: string;
  password: string;
}

interface TestResult {
  success: boolean;
  message: string;
}

const emptyDraft = (): ProxyDraft => ({ host: '', port: '', username: '', password: '' });

/**
 * Per-session BYOP configuration. Mounted inside the Settings page.
 *
 * Each WhatsApp session gets a card showing:
 *  - current proxy mode (Shared pool / Custom (host:port) / Misconfigured)
 *  - an inline editor to switch between modes
 *  - a "Test Proxy Connection" button (POST /api/bot/proxy-test)
 *  - a Save button (PUT /api/bot/sessions/proxy)
 *
 * The Save button is disabled when mode === 'custom' and host/port are empty,
 * mirroring the server-side superRefine in /api/bot/sessions/proxy.
 *
 * NOTE: proxy_password is never returned by GET /api/bot/sessions for safety,
 * so when a user opens the editor for an existing BYOP session the password
 * field starts blank. If they save without re-entering it, the API treats the
 * undefined value as "no change" — the existing password row stays intact.
 */
export default function ProxySettingsSection() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEditor, setOpenEditor] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ProxyDraft>>({});
  const [draftMode, setDraftMode] = useState<Record<string, 'shared' | 'custom'>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult | null>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveResults, setSaveResults] = useState<Record<string, TestResult | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/bot/sessions');
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.data)) {
          const whatsappSessions: SessionRow[] = data.data.filter(
            (s: SessionRow) => (s.platform || 'whatsapp') === 'whatsapp',
          );
          setSessions(whatsappSessions);
        }
      } catch {
        // ignore - section just renders empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openSession = (s: SessionRow) => {
    const mode: 'shared' | 'custom' = s.proxy_type === 'custom' ? 'custom' : 'shared';
    setDraftMode((prev) => ({ ...prev, [s.id]: mode }));
    setDrafts((prev) => ({
      ...prev,
      [s.id]: {
        host: s.proxy_host || '',
        port: s.proxy_port || '',
        username: s.proxy_username || '',
        password: '', // never round-tripped to client
      },
    }));
    setTestResults((prev) => ({ ...prev, [s.id]: null }));
    setSaveResults((prev) => ({ ...prev, [s.id]: null }));
    setOpenEditor(s.id);
  };

  const closeEditor = () => setOpenEditor(null);

  const updateDraft = (id: string, patch: Partial<ProxyDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setTestResults((prev) => ({ ...prev, [id]: null }));
  };

  const setMode = (id: string, mode: 'shared' | 'custom') => {
    setDraftMode((prev) => ({ ...prev, [id]: mode }));
    setTestResults((prev) => ({ ...prev, [id]: null }));
  };

  const handleTest = async (id: string) => {
    const draft = drafts[id];
    if (!draft?.host || !draft?.port) return;
    setTesting((prev) => ({ ...prev, [id]: true }));
    setTestResults((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await fetch('/api/bot/proxy-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: !!data.success,
          message: data.success ? (data.message || 'Connection OK') : (data.error || 'Test failed'),
        },
      }));
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { success: false, message: 'Test request failed' } }));
    } finally {
      setTesting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleSave = async (id: string) => {
    const mode = draftMode[id] || 'shared';
    const draft = drafts[id] || emptyDraft();
    setSaving((prev) => ({ ...prev, [id]: true }));
    setSaveResults((prev) => ({ ...prev, [id]: null }));
    try {
      const body: Record<string, unknown> = { sessionId: id, proxyType: mode };
      if (mode === 'custom') {
        body.proxyHost = draft.host.trim();
        body.proxyPort = draft.port.trim();
        if (draft.username.trim()) body.proxyUsername = draft.username.trim();
        if (draft.password) body.proxyPassword = draft.password;
      }
      const res = await fetch('/api/bot/sessions/proxy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data?.error || data?.message || 'Failed to update proxy settings';
        setSaveResults((prev) => ({ ...prev, [id]: { success: false, message: msg } }));
        return;
      }
      // Reflect new state locally so the card title updates without a refetch.
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                proxy_type: mode,
                proxy_host: mode === 'custom' ? draft.host.trim() : null,
                proxy_port: mode === 'custom' ? draft.port.trim() : null,
                proxy_username: mode === 'custom' ? draft.username.trim() || null : null,
              }
            : s,
        ),
      );
      setSaveResults((prev) => ({
        ...prev,
        [id]: { success: true, message: data.message || 'Saved. Effective on next reconnect.' },
      }));
      setOpenEditor(null);
    } catch {
      setSaveResults((prev) => ({ ...prev, [id]: { success: false, message: 'Network error' } }));
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="border-t border-blue-500/10 pt-8">
        <h3 className="font-display text-sm tracking-[3px] text-blue-600 dark:text-blue-400 mb-4">PROXY SETTINGS</h3>
        <p className="font-mono text-[10px] text-[#3a6a5a]">Loading sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="border-t border-blue-500/10 pt-8">
        <h3 className="font-display text-sm tracking-[3px] text-blue-600 dark:text-blue-400 mb-4">PROXY SETTINGS</h3>
        <p className="font-mono text-[10px] text-[#3a6a5a]">
          No WhatsApp sessions yet. Create one to configure proxy settings.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-blue-500/10 pt-8">
      <h3 className="font-display text-sm tracking-[3px] text-blue-600 dark:text-blue-400 mb-4">
        PROXY SETTINGS <span className="font-mono text-[9px] text-blue-500/60 ml-2">WHATSAPP</span>
      </h3>
      <p className="font-mono text-[10px] text-[#3a6a5a] mb-6">
        Each WhatsApp session can use the BotWave shared proxy pool (free) or a custom proxy you provide (BYOP).
        Changes take effect on the next reconnect.
      </p>

      <div className="space-y-3">
        {sessions.map((s) => {
          const proxyType = s.proxy_type || 'shared';
          const misconfigured = proxyType === 'custom' && (!s.proxy_host || !s.proxy_port);
          const mode = draftMode[s.id] || (proxyType === 'custom' ? 'custom' : 'shared');
          const draft = drafts[s.id] || emptyDraft();
          const test = testResults[s.id];
          const save = saveResults[s.id];
          const isOpen = openEditor === s.id;
          const isSaving = !!saving[s.id];
          const isTesting = !!testing[s.id];
          const canSave =
            !isSaving &&
            (mode === 'shared' ||
              (mode === 'custom' && draft.host.trim().length > 0 && draft.port.trim().length > 0));

          return (
            <div
              key={s.id}
              className={`border p-4 rounded ${
                misconfigured ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-blue-500/10 bg-dark/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-mono text-xs text-white">{s.session_name}</p>
                  <p className="font-mono text-[10px] text-[#5a9a7a] mt-1">
                    {proxyType === 'custom'
                      ? misconfigured
                        ? 'BYOP selected but proxy host/port are empty — falling back to shared pool.'
                        : `Custom (${s.proxy_host}:${s.proxy_port})`
                      : 'Shared proxy pool (free)'}
                  </p>
                </div>
                {!isOpen && (
                  <button
                    onClick={() => openSession(s)}
                    className="font-mono text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-600 tracking-[2px]"
                  >
                    EDIT
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="mt-4 space-y-3 border-t border-blue-500/10 pt-4">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`proxy-mode-${s.id}`}
                        checked={mode === 'shared'}
                        onChange={() => setMode(s.id, 'shared')}
                        className="mt-0.5 accent-blue-500"
                      />
                      <div>
                        <span className="font-mono text-[10px] text-white tracking-[1px]">SHARED POOL (FREE)</span>
                        <p className="font-mono text-[9px] text-[#3a6a5a] mt-0.5">
                          Use BotWave&apos;s rotated proxy pool. Best for testing or low-volume use.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`proxy-mode-${s.id}`}
                        checked={mode === 'custom'}
                        onChange={() => setMode(s.id, 'custom')}
                        className="mt-0.5 accent-green-500"
                      />
                      <div>
                        <span className="font-mono text-[10px] text-white tracking-[1px]">BRING YOUR OWN PROXY</span>
                        <p className="font-mono text-[9px] text-[#3a6a5a] mt-0.5">
                          Stable, dedicated connection from any country. You provide the credentials.
                        </p>
                      </div>
                    </label>
                  </div>

                  {mode === 'custom' && (
                    <div className="space-y-2 pl-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-mono text-[9px] text-[#5a9a7a] mb-1 tracking-[2px]">HOST</label>
                          <input
                            type="text"
                            value={draft.host}
                            onChange={(e) => updateDraft(s.id, { host: e.target.value })}
                            className="w-full bg-dark border border-blue-500/20 px-2 py-1.5 font-mono text-[10px] text-white focus:border-blue-500/60 outline-none rounded"
                            placeholder="proxy.example.com"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[9px] text-[#5a9a7a] mb-1 tracking-[2px]">PORT</label>
                          <input
                            type="text"
                            value={draft.port}
                            onChange={(e) => updateDraft(s.id, { port: e.target.value })}
                            className="w-full bg-dark border border-blue-500/20 px-2 py-1.5 font-mono text-[10px] text-white focus:border-blue-500/60 outline-none rounded"
                            placeholder="8080"
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-mono text-[9px] text-[#5a9a7a] mb-1 tracking-[2px]">
                            USERNAME <span className="text-[#3a6a5a]">(optional)</span>
                          </label>
                          <input
                            type="text"
                            value={draft.username}
                            onChange={(e) => updateDraft(s.id, { username: e.target.value })}
                            className="w-full bg-dark border border-blue-500/20 px-2 py-1.5 font-mono text-[10px] text-white focus:border-blue-500/60 outline-none rounded"
                            placeholder="user"
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[9px] text-[#5a9a7a] mb-1 tracking-[2px]">
                            PASSWORD <span className="text-[#3a6a5a]">(optional)</span>
                          </label>
                          <input
                            type="password"
                            value={draft.password}
                            onChange={(e) => updateDraft(s.id, { password: e.target.value })}
                            className="w-full bg-dark border border-blue-500/20 px-2 py-1.5 font-mono text-[10px] text-white focus:border-blue-500/60 outline-none rounded"
                            placeholder={proxyType === 'custom' && s.proxy_host ? '(unchanged)' : 'pass'}
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTest(s.id)}
                        disabled={!draft.host || !draft.port || isTesting}
                        className="w-full border border-green-500/40 text-green-500 dark:text-green-400 px-3 py-1.5 font-mono text-[10px] tracking-[2px] hover:bg-green-500/10 transition-colors disabled:opacity-50 rounded"
                      >
                        {isTesting ? 'TESTING...' : 'TEST PROXY CONNECTION'}
                      </button>
                      {test && (
                        <p
                          className={`font-mono text-[10px] ${
                            test.success ? 'text-green-500 dark:text-green-400' : 'text-red-400'
                          }`}
                        >
                          {test.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleSave(s.id)}
                      disabled={!canSave}
                      className="bg-blue-500 text-dark px-4 py-1.5 font-mono text-[10px] font-bold tracking-[2px] hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed rounded"
                    >
                      {isSaving ? 'SAVING...' : 'SAVE'}
                    </button>
                    <button
                      onClick={closeEditor}
                      disabled={isSaving}
                      className="font-mono text-[10px] text-[#5a5a5a] hover:text-white tracking-[2px]"
                    >
                      CANCEL
                    </button>
                    {save && (
                      <p
                        className={`font-mono text-[10px] ${
                          save.success ? 'text-green-500 dark:text-green-400' : 'text-red-400'
                        }`}
                      >
                        {save.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!isOpen && save?.success && (
                <p className="font-mono text-[10px] text-green-500 dark:text-green-400 mt-2">{save.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

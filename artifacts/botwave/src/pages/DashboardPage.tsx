import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import Navbar from '@/components/layout/Navbar';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function getToken(): string | null {
  return localStorage.getItem('bw_token');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status, body });
  }
  return res.json();
}

type Platform = 'telegram-bot' | 'telegram-userbot';

interface ApiSession {
  id: string;
  name: string;
  platform: string;
  status: string;
  phoneNumber?: string | null;
  botToken?: string | null;
  features: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

type FeatureCategory = 'protection' | 'moderation' | 'content' | 'media' | 'fun' | 'utility';

interface Feature {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: FeatureCategory;
  enabled: boolean;
}

const ALL_FEATURES: Feature[] = [
  { id: 'antiSpam', name: 'Anti-Spam', description: 'Block floods and spam', icon: '🛡️', category: 'protection', enabled: false },
  { id: 'antiLink', name: 'Anti-Link', description: 'Remove unauthorized links', icon: '🔗', category: 'protection', enabled: false },
  { id: 'captcha', name: 'Captcha Verification', description: 'Verify new members', icon: '🔐', category: 'protection', enabled: false },
  { id: 'welcomeMessage', name: 'Welcome Message', description: 'Greet new members automatically', icon: '👋', category: 'moderation', enabled: false },
  { id: 'ghostMode', name: 'Ghost Mode', description: 'Operate only during active hours', icon: '👻', category: 'moderation', enabled: false },
  { id: 'antiraid', name: 'Anti-Raid', description: 'Block mass-join attacks', icon: '⚡', category: 'protection', enabled: false },
  { id: 'autoReply', name: 'Auto Reply', description: 'Keyword-based auto-responses', icon: '💬', category: 'content', enabled: false },
  { id: 'aiChat', name: 'AI Chat', description: 'Intelligent responses via Gemini', icon: '🤖', category: 'content', enabled: false },
  { id: 'groupStats', name: 'Group Digest', description: 'AI summary of group chats', icon: '📋', category: 'content', enabled: false },
  { id: 'stickerMaker', name: 'Sticker Maker', description: 'Convert images to stickers', icon: '🎨', category: 'media', enabled: false },
  { id: 'mediaDownloader', name: 'Media Downloader', description: 'Download from YT, TikTok, IG', icon: '📥', category: 'media', enabled: false },
  { id: 'games', name: 'Mini Games', description: 'Trivia, Hangman, WordChain', icon: '🎮', category: 'fun', enabled: false },
  { id: 'polls', name: 'Polls & Voting', description: 'Group polls and reactions', icon: '📊', category: 'fun', enabled: false },
  { id: 'broadcastScheduler', name: 'Broadcast Scheduler', description: 'Send at specific times', icon: '📅', category: 'utility', enabled: false },
  { id: 'contactHarvester', name: 'Auto-Translate', description: 'Translate messages live', icon: '🌍', category: 'utility', enabled: false },
];

const CATEGORIES: { id: FeatureCategory; label: string; icon: string }[] = [
  { id: 'protection', label: 'Protection', icon: '🛡️' },
  { id: 'moderation', label: 'Moderation', icon: '👮' },
  { id: 'content', label: 'Content', icon: '💬' },
  { id: 'media', label: 'Media', icon: '🎨' },
  { id: 'fun', label: 'Fun & Games', icon: '🎮' },
  { id: 'utility', label: 'Utilities', icon: '🔧' },
];

const platformLabels: Record<Platform, string> = {
  'telegram-bot': 'Telegram Bot',
  'telegram-userbot': 'Telegram Userbot',
};

const platformIcons: Record<Platform, string> = {
  'telegram-bot': '🤖',
  'telegram-userbot': '👤',
};

const statusColors: Record<string, string> = {
  active: 'text-emerald-500',
  disconnected: 'text-gray-400',
  connecting: 'text-yellow-500',
  error: 'text-red-400',
};

function featuresFromApi(apiFeatures: Record<string, boolean>): Feature[] {
  return ALL_FEATURES.map(f => ({ ...f, enabled: apiFeatures[f.id] ?? false }));
}

export default function DashboardPage() {
  const params = useParams<{ section?: string }>();
  const [, navigate] = useLocation();
  const section = params?.section ?? 'sessions';

  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [features, setFeatures] = useState<Feature[]>(ALL_FEATURES);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featureSaving, setFeatureSaving] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<FeatureCategory>('protection');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ sessions: { total: number; active: number }; uptime: number } | null>(null);

  const token = getToken();

  const fetchSessions = useCallback(async () => {
    if (!token) { setSessionsLoading(false); return; }
    setSessionsLoading(true);
    try {
      const data = await apiFetch<{ sessions: ApiSession[] }>('/bot/sessions');
      setSessions(data.sessions);
      if (data.sessions.length > 0 && !activeSessionId) {
        setActiveSessionId(data.sessions[0].id);
      }
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 401) {
        navigate('/login');
        return;
      }
      setSessionsError(e.message ?? 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, [token, activeSessionId, navigate]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ sessions: { total: number; active: number }; uptime: number }>('/bot/stats');
      setStats(data);
    } catch {
    }
  }, [token]);

  useEffect(() => { fetchSessions(); fetchStats(); }, [fetchSessions, fetchStats]);

  const fetchFeatures = useCallback(async (sessionId: string) => {
    setFeaturesLoading(true);
    try {
      const data = await apiFetch<{ features: Record<string, boolean> }>(`/bot/sessions/${sessionId}/features`);
      setFeatures(featuresFromApi(data.features));
    } catch {
      setFeatures(ALL_FEATURES);
    } finally {
      setFeaturesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSessionId && section === 'features') {
      fetchFeatures(activeSessionId);
    }
  }, [activeSessionId, section, fetchFeatures]);

  const toggleFeature = async (featureId: string) => {
    if (!activeSessionId) return;
    const feat = features.find(f => f.id === featureId);
    if (!feat) return;

    const newValue = !feat.enabled;
    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, enabled: newValue } : f));
    setFeatureSaving(featureId);
    try {
      await apiFetch(`/bot/sessions/${activeSessionId}/features`, {
        method: 'PUT',
        body: JSON.stringify({ features: { [featureId]: newValue } }),
      });
    } catch {
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, enabled: !newValue } : f));
    } finally {
      setFeatureSaving(null);
    }
  };

  const handleAddSession = async () => {
    if (!selectedPlatform || !newSessionName.trim()) return;
    setSaving(true);
    try {
      const data = await apiFetch<{ session: ApiSession }>('/bot/sessions', {
        method: 'POST',
        body: JSON.stringify({
          name: newSessionName.trim(),
          platform: selectedPlatform,
          botToken: newBotToken.trim() || undefined,
        }),
      });
      setSessions(prev => [...prev, data.session]);
      setActiveSessionId(data.session.id);
      setShowAddModal(false);
      setSelectedPlatform(null);
      setNewSessionName('');
      setNewBotToken('');
      setStep(1);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 401) navigate('/login');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiFetch(`/bot/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId);
        setActiveSessionId(remaining[0]?.id ?? null);
      }
    } catch {
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setStep(1);
    setSelectedPlatform(null);
    setNewSessionName('');
    setNewBotToken('');
  };

  const filteredFeatures = features.filter(f => f.category === activeCategory);
  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;

  const navLinks = [
    { href: '/dashboard', label: 'Sessions', icon: '📱', active: !section || section === 'sessions' },
    { href: '/dashboard/features', label: 'Features', icon: '⚙️', active: section === 'features' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: '📊', active: section === 'analytics' },
    { href: '/dashboard/messages', label: 'Messages', icon: '💬', active: section === 'messages' },
    { href: '/dashboard/scheduled', label: 'Scheduled', icon: '📅', active: section === 'scheduled' },
    { href: '/dashboard/settings', label: 'Settings', icon: '🔧', active: section === 'settings' },
  ];

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign in required</h2>
            <p className="text-[var(--text-secondary)] mb-6">Please sign in to access your dashboard.</p>
            <Link href="/login" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Navbar />

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-[var(--border)] hidden md:flex flex-col pt-8 px-3">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Dashboard</p>
          </div>
          <nav className="space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  link.active
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--card-bg,var(--surface))] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>

          {activeSession && (
            <div className="mt-6 px-2">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Active Session</p>
              <div className="text-xs text-[var(--text-secondary)] truncate">
                {platformIcons[activeSession.platform as Platform] ?? '🤖'} {activeSession.name}
              </div>
              <div className={`text-xs mt-0.5 ${statusColors[activeSession.status] ?? 'text-gray-400'}`}>
                ● {activeSession.status}
              </div>
            </div>
          )}

          <div className="mt-auto pb-6 px-2">
            <Link href="/pricing" className="block text-xs text-[var(--text-muted)] hover:text-blue-500 transition-colors">
              Upgrade Plan →
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Sessions view */}
          {(!section || section === 'sessions') && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bot Sessions</h1>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  + Connect New Session
                </button>
              </div>

              {sessionsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sessionsError ? (
                <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
                  {sessionsError}
                  <button onClick={fetchSessions} className="block mx-auto mt-3 text-sm underline">Retry</button>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">🤖</div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No sessions yet</h2>
                  <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
                    Connect your Telegram bot or userbot account to start automating your groups.
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    Connect First Session →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => setActiveSessionId(session.id)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                        activeSessionId === session.id
                          ? 'bg-blue-600/10 border-blue-500/40'
                          : 'bg-[var(--card-bg,var(--surface))] border-[var(--border)] hover:border-blue-400/40'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl">{platformIcons[session.platform as Platform] ?? '🤖'}</span>
                        <span className={`text-xs font-medium ${statusColors[session.status] ?? 'text-gray-400'}`}>
                          ● {session.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-[var(--text-primary)] mb-1">{session.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] mb-4">{platformLabels[session.platform as Platform] ?? session.platform}</p>
                      <div className="flex gap-2">
                        <Link
                          href="/dashboard/features"
                          onClick={() => setActiveSessionId(session.id)}
                          className="flex-1 py-1.5 text-xs border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:border-blue-400 transition-colors text-center"
                        >
                          Features
                        </Link>
                        <button
                          className="flex-1 py-1.5 text-xs border border-red-500/20 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Features view */}
          {section === 'features' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bot Features</h1>
                <p className="text-sm text-[var(--text-muted)]">
                  {features.filter(f => f.enabled).length} / {features.length} enabled
                </p>
              </div>

              {!activeSession ? (
                <div className="p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-center">
                  <p className="text-[var(--text-muted)] text-sm mb-4">Select or connect a session to manage features.</p>
                  <button onClick={() => setShowAddModal(true)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">
                    Connect Session →
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[var(--text-muted)] mb-4">Managing features for: <span className="text-blue-400">{activeSession.name}</span></p>
                  <div className="flex gap-2 flex-wrap mb-6">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          activeCategory === cat.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-[var(--text-secondary)] hover:border-blue-400'
                        }`}
                      >
                        <span>{cat.icon}</span>{cat.label}
                      </button>
                    ))}
                  </div>

                  {featuresLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredFeatures.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{f.icon}</span>
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">{f.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">{f.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleFeature(f.id)}
                            disabled={featureSaving === f.id}
                            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 disabled:opacity-60 ${f.enabled ? 'bg-blue-600' : 'bg-[var(--border)]'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${f.enabled ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Analytics */}
          {section === 'analytics' && (
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Analytics</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Sessions', value: stats ? String(stats.sessions.total) : String(sessions.length) },
                  { label: 'Active Sessions', value: stats ? String(stats.sessions.active) : '0' },
                  { label: 'Messages Sent', value: '—' },
                  { label: 'API Uptime', value: stats ? `${Math.floor(stats.uptime / 60)}m` : '—' },
                ].map(stat => (
                  <div key={stat.label} className="p-5 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-center">
                    <div className="text-2xl font-black text-blue-500 mb-1">{stat.value}</div>
                    <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-center">
                <p className="text-[var(--text-muted)] text-sm">Detailed analytics become available once your bot sends and receives messages.</p>
              </div>
            </div>
          )}

          {/* Generic stub for other sections */}
          {!['sessions', 'features', 'analytics', undefined].includes(section) && (
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4 capitalize">{section?.replace(/-/g, ' ')}</h1>
              <div className="p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-center">
                <p className="text-[var(--text-muted)] text-sm">Connect a session to access this section.</p>
                <button onClick={() => setShowAddModal(true)} className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">
                  Connect Session →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Connect New Session</h2>
              <button onClick={closeModal} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">×</button>
            </div>

            {step === 1 && (
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Choose which platform to connect:</p>
                <div className="space-y-2">
                  {(['telegram-bot', 'telegram-userbot'] as Platform[]).map(platform => (
                    <button
                      key={platform}
                      onClick={() => { setSelectedPlatform(platform); setStep(2); }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-blue-400 text-left transition-colors"
                    >
                      <span className="text-2xl">{platformIcons[platform]}</span>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)] text-sm">{platformLabels[platform]}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {platform === 'telegram-bot' && 'Connect via @BotFather token'}
                          {platform === 'telegram-userbot' && 'Connect your personal Telegram account'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && selectedPlatform && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setStep(1)} className="text-blue-500 text-sm hover:underline">← Back</button>
                  <span className="text-sm text-[var(--text-muted)]">{platformLabels[selectedPlatform]}</span>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Session name</label>
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={e => setNewSessionName(e.target.value)}
                    placeholder="My Telegram Bot"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {selectedPlatform === 'telegram-bot' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Bot token (from @BotFather)</label>
                    <input
                      type="text"
                      value={newBotToken}
                      onChange={e => setNewBotToken(e.target.value)}
                      placeholder="1234567890:ABCdef..."
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}

                <button
                  onClick={handleAddSession}
                  disabled={!newSessionName.trim() || saving}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                >
                  {saving ? 'Connecting…' : 'Connect Session'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

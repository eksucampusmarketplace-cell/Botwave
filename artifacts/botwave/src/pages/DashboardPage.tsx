import { useState } from 'react';
import { Link, useParams } from 'wouter';
import Navbar from '@/components/layout/Navbar';

type Platform = 'whatsapp' | 'telegram-bot' | 'telegram-userbot';

interface Session {
  id: string;
  name: string;
  platform: Platform;
  state: 'active' | 'offline' | 'needs_reauth';
  phone?: string;
  username?: string;
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

const MOCK_SESSIONS: Session[] = [];

const ALL_FEATURES: Feature[] = [
  { id: 'ai_chat', name: 'AI Chat', description: 'Intelligent responses via Gemini', icon: '🤖', category: 'content', enabled: true },
  { id: 'sticker', name: 'Sticker Maker', description: 'Convert images to stickers', icon: '🎨', category: 'media', enabled: true },
  { id: 'downloader', name: 'Media Downloader', description: 'Download from YT, TikTok, IG', icon: '📥', category: 'media', enabled: true },
  { id: 'auto_reply', name: 'Auto Reply', description: 'Keyword-based auto-responses', icon: '💬', category: 'content', enabled: false },
  { id: 'anti_spam', name: 'Anti-Spam', description: 'Block floods and spam', icon: '🛡️', category: 'protection', enabled: true },
  { id: 'welcome', name: 'Welcome Message', description: 'Greet new members', icon: '👋', category: 'moderation', enabled: false },
  { id: 'captcha', name: 'Captcha Verification', description: 'Verify new members', icon: '🔐', category: 'protection', enabled: false },
  { id: 'polls', name: 'Polls & Games', description: 'Trivia, hangman, polls', icon: '📊', category: 'fun', enabled: true },
  { id: 'scheduled', name: 'Scheduled Messages', description: 'Send at specific times', icon: '📅', category: 'utility', enabled: false },
  { id: 'games', name: 'Mini Games', description: 'Trivia, Hangman, WordChain', icon: '🎮', category: 'fun', enabled: true },
  { id: 'ocr', name: 'OCR Text Extraction', description: 'Read text from images', icon: '📝', category: 'utility', enabled: true },
  { id: 'night_mode', name: 'Night Mode', description: 'Auto-lock group at night', icon: '🌙', category: 'moderation', enabled: false },
  { id: 'antiraid', name: 'Anti-Raid', description: 'Block mass-join attacks', icon: '⚡', category: 'protection', enabled: false },
  { id: 'translate', name: 'Auto-Translate', description: 'Translate messages live', icon: '🌍', category: 'utility', enabled: false },
  { id: 'digest', name: 'Group Digest', description: 'AI summary of group chats', icon: '📋', category: 'content', enabled: false },
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
  whatsapp: 'WhatsApp',
  'telegram-bot': 'Telegram Bot',
  'telegram-userbot': 'Telegram Userbot',
};

const platformIcons: Record<Platform, string> = {
  whatsapp: '💬',
  'telegram-bot': '🤖',
  'telegram-userbot': '👤',
};

const stateColors: Record<string, string> = {
  active: 'text-emerald-500',
  offline: 'text-gray-500',
  needs_reauth: 'text-yellow-500',
};

export default function DashboardPage() {
  const params = useParams<{ section?: string }>();
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
  const [features, setFeatures] = useState<Feature[]>(ALL_FEATURES);
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>('protection');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [step, setStep] = useState(1);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const section = params?.section ?? 'sessions';

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const handleAddSession = () => {
    if (!selectedPlatform || !newSessionName.trim()) return;
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name: newSessionName.trim(),
      platform: selectedPlatform,
      state: 'offline',
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    setShowAddModal(false);
    setSelectedPlatform(null);
    setNewSessionName('');
    setStep(1);
  };

  const filteredFeatures = features.filter(f => f.category === activeCategory);
  const activeSession = sessions.find(s => s.id === activeSessionId) ?? sessions[0] ?? null;

  const navLinks = [
    { href: '/dashboard', label: 'Sessions', icon: '📱', active: !section || section === 'sessions' },
    { href: '/dashboard/features', label: 'Features', icon: '⚙️', active: section === 'features' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: '📊', active: section === 'analytics' },
    { href: '/dashboard/messages', label: 'Messages', icon: '💬', active: section === 'messages' },
    { href: '/dashboard/scheduled', label: 'Scheduled', icon: '📅', active: section === 'scheduled' },
    { href: '/dashboard/settings', label: 'Settings', icon: '🔧', active: section === 'settings' },
  ];

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

              {sessions.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">🤖</div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No sessions yet</h2>
                  <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
                    Connect your WhatsApp or Telegram account to start automating your groups.
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
                    <div key={session.id} className="p-5 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl">{platformIcons[session.platform]}</span>
                        <span className={`text-xs font-medium ${stateColors[session.state]}`}>
                          ● {session.state === 'needs_reauth' ? 'Needs Auth' : session.state.charAt(0).toUpperCase() + session.state.slice(1)}
                        </span>
                      </div>
                      <h3 className="font-bold text-[var(--text-primary)] mb-1">{session.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] mb-4">{platformLabels[session.platform]}</p>
                      <div className="flex gap-2">
                        <button className="flex-1 py-1.5 text-xs border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:border-blue-400 transition-colors">
                          Manage
                        </button>
                        <button className="flex-1 py-1.5 text-xs border border-red-500/20 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          onClick={() => setSessions(prev => prev.filter(s => s.id !== session.id))}>
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
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bot Features</h1>
                <p className="text-sm text-[var(--text-muted)]">
                  {features.filter(f => f.enabled).length} / {features.length} enabled
                </p>
              </div>

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
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${f.enabled ? 'bg-blue-600' : 'bg-[var(--border)]'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${f.enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics stub */}
          {section === 'analytics' && (
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Analytics</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Messages This Month', value: '—' },
                  { label: 'Commands Used', value: '—' },
                  { label: 'Active Sessions', value: sessions.filter(s => s.state === 'active').length.toString() },
                  { label: 'Uptime', value: sessions.length ? '—' : 'N/A' },
                ].map(stat => (
                  <div key={stat.label} className="p-5 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-center">
                    <div className="text-2xl font-black text-blue-500 mb-1">{stat.value}</div>
                    <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-center">
                <p className="text-[var(--text-muted)] text-sm">Analytics become available once you connect a session and start using the bot.</p>
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
              <button onClick={() => { setShowAddModal(false); setStep(1); setSelectedPlatform(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">×</button>
            </div>

            {step === 1 && (
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Choose which platform to connect:</p>
                <div className="space-y-2">
                  {(['whatsapp', 'telegram-bot', 'telegram-userbot'] as Platform[]).map(platform => (
                    <button
                      key={platform}
                      onClick={() => { setSelectedPlatform(platform); setStep(2); }}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                        selectedPlatform === platform
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-[var(--border)] hover:border-blue-400'
                      }`}
                    >
                      <span className="text-2xl">{platformIcons[platform]}</span>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)] text-sm">{platformLabels[platform]}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {platform === 'whatsapp' && 'Connect via QR code scan'}
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
                    placeholder={selectedPlatform === 'whatsapp' ? 'My WhatsApp Bot' : 'My Telegram Bot'}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {selectedPlatform === 'whatsapp' && (
                  <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] mb-4 text-center">
                    <p className="text-sm text-[var(--text-secondary)] mb-3">After clicking Connect, a QR code will appear here.</p>
                    <div className="w-40 h-40 mx-auto rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] text-xs">
                      QR Code<br />appears here
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-3">Open WhatsApp → Linked Devices → Link a Device</p>
                  </div>
                )}

                {selectedPlatform === 'telegram-bot' && (
                  <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] mb-4">
                    <p className="text-xs text-[var(--text-muted)] mb-2">Bot token (from @BotFather)</p>
                    <input
                      type="text"
                      placeholder="1234567890:ABCdef..."
                      className="w-full px-3 py-2 rounded-lg bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}

                <button
                  onClick={handleAddSession}
                  disabled={!newSessionName.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                >
                  Connect Session
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

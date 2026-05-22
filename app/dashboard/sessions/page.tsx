'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import SessionCard from '@/components/ui/SessionCard';
import QRCodeDisplay from '@/components/ui/QRCodeDisplay';
import PlatformSelector from '@/components/ui/PlatformSelector';
import TelegramBotSetup from '@/components/ui/TelegramBotSetup';
import TelegramUserbotSetup from '@/components/ui/TelegramUserbotSetup';
import { createClient } from '@/lib/supabase/client';
import type { BotSession, Platform } from '@/lib/types';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [activeSession, setActiveSession] = useState<BotSession | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', phone: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [proxyType, setProxyType] = useState<'shared' | 'custom'>('shared');
  const [customProxy, setCustomProxy] = useState({ host: '', port: '', username: '', password: '' });
  const [proxyTesting, setProxyTesting] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);

  const supabase = useRef(createClient()).current;
  const activeSessionRef = useRef<BotSession | null>(null);

  // Detect ?onboarding=1 from the welcome redirect on /dashboard.
  // When set, auto-open the create-session modal and show a welcome banner
  // so first-time users land directly on the pair flow.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === '1') {
      setIsOnboarding(true);
      setShowAddModal(true);
    }
  }, []);

  const dismissOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('botwave_welcome_dismissed', '1');
    }
    setIsOnboarding(false);
  }, []);

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/bot/sessions');
      const data = await response.json();
      if (data.success) {
        setSessions(data.data);
        
        const currentActive = activeSessionRef.current;
        if (currentActive) {
          const updated = data.data.find((s: BotSession) => s.id === currentActive.id);
          if (updated) {
            setActiveSession(updated);
            activeSessionRef.current = updated;
            if (updated.state === 'active') {
              setShowQR(false);
            }
          }
        }
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Fallback to session check - getUser makes a network call that can fail
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            window.location.href = '/login';
            return;
          }
        }
      } catch {
        // Network error - middleware already validated auth, proceed
        console.warn('[Sessions] Auth check failed (network error) - staying on page');
      }
      fetchSessions();
    };
    checkUser();
  }, [supabase, fetchSessions]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQR && activeSessionRef.current) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('/api/bot/sessions');
          const data = await response.json();
          if (data.success) {
            setSessions(data.data);
            const refreshed = data.data.find((s: BotSession) => s.id === activeSessionRef.current?.id);
            if (refreshed) {
              setActiveSession(refreshed);
              activeSessionRef.current = refreshed;
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showQR]);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setIsCreating(true);
    setError(null);
    setShowConfirm(false);
    try {
      const response = await fetch('/api/bot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: newSession.name,
          phoneNumber: newSession.phone,
          platform: 'whatsapp',
          proxyType,
          ...(proxyType === 'custom' && customProxy.host && customProxy.port ? {
            proxyHost: customProxy.host,
            proxyPort: customProxy.port,
            proxyUsername: customProxy.username || undefined,
            proxyPassword: customProxy.password || undefined,
          } : {}),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setNewSession({ name: '', phone: '' });
        setSelectedPlatform(null);
        setProxyType('shared');
        setCustomProxy({ host: '', port: '', username: '', password: '' });
        setProxyTestResult(null);
        fetchSessions();
        setActiveSession(data.data);
        setShowQR(true);
      } else {
        setError(data.error || 'Failed to create session');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Add session error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTelegramBotComplete = async (data: { token: string; botUsername: string; sessionName: string }) => {
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/bot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: data.sessionName,
          platform: 'telegram_bot',
          telegramBotToken: data.token,
          telegramBotUsername: data.botUsername,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowAddModal(false);
        setSelectedPlatform(null);
        fetchSessions();
      } else {
        setError(result.error || 'Failed to create Telegram bot session');
      }
    } catch {
      setError('Failed to create Telegram bot session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUserbotComplete = async (data: { sessionString: string; sessionName: string; apiId: number; apiHash: string }) => {
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/bot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: data.sessionName,
          platform: 'telegram_userbot',
          telegramApiId: data.apiId,
          telegramApiHash: data.apiHash,
          telegramSessionString: data.sessionString,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowAddModal(false);
        setSelectedPlatform(null);
        fetchSessions();
      } else {
        setError(result.error || 'Failed to create userbot session');
      }
    } catch {
      setError('Failed to create userbot session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnect = async (session: BotSession) => {
    // Telegram bot and userbot don't use QR/pairing codes — they reconnect automatically
    if (session.platform === 'telegram_bot' || session.platform === 'telegram_userbot') {
      try {
        const response = await fetch('/api/bot/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        });
        const data = await response.json();
        if (data.success) {
          fetchSessions();
        } else {
          setError(data.error || 'Failed to reconnect session');
        }
      } catch (err) {
        console.error('Reconnect error:', err);
        setError('Failed to reconnect session');
      }
      return;
    }
    // For WhatsApp sessions, reset state so the worker generates a fresh pairing code
    if (session.state === 'needs_reauth' || session.state === 'inactive') {
      try {
        const response = await fetch('/api/bot/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        });
        const data = await response.json();
        if (data.success) {
          session = data.data;
        }
      } catch (err) {
        console.error('Reconnect error:', err);
      }
    }
    setActiveSession(session);
    setShowQR(true);
  };

  const handleDisconnectSession = async (sessionId: string) => {
    if (!confirm('Disconnect this session? The bot will stop responding. You can reconnect it later.')) return;

    try {
      const response = await fetch('/api/bot/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (data.success) {
        fetchSessions();
      } else {
        setError(data.error || 'Failed to disconnect session');
      }
    } catch {
      setError('Failed to disconnect session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/bot/sessions?id=${sessionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchSessions();
      } else {
        setError(data.error || 'Failed to delete session');
      }
    } catch {
      setError('Failed to delete session');
    }
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        {sessions.some(s => s.state === 'needs_reauth') && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-600 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div>
              <h3 className="text-lg text-red-600 font-bold">Action Required: Session Disconnected</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                One or more of your sessions have been disconnected. Re-authenticate to resume service.
              </p>
            </div>
            <button 
              onClick={() => {
                const session = sessions.find(s => s.state === 'needs_reauth');
                if (session) handleConnect(session);
              }}
              className="px-6 py-3 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              Reconnect Now
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Bot <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Sessions</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Manage your connected WhatsApp &amp; Telegram sessions
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center text-blue-600 dark:text-blue-400 py-12">
            Loading sessions...
          </div>
        ) : (
          <div className="space-y-10">
            {/* WhatsApp Sessions Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>WhatsApp Sessions</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400">
                  {sessions.filter(s => s.platform === 'whatsapp').length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.filter(s => s.platform === 'whatsapp').map((session) => (
                  <SessionCard
                    key={session.id}
                    name={session.session_name}
                    phone={session.phone_number}
                    status={session.state === 'qr_pending' || session.state === 'pairing_sent' ? 'pending' : session.state}
                    lastActive={session.last_active ? new Date(session.last_active).toLocaleString() : 'Never'}
                    lastActiveRaw={session.last_active}
                    lastPairingError={session.last_pairing_error}
                    platform={session.platform}
                    sessionId={session.id}
                    onConnect={() => handleConnect(session)}
                    onDisconnect={() => handleDisconnectSession(session.id)}
                    onDelete={() => handleDeleteSession(session.id)}
                  />
                ))}
                <button
                  onClick={() => { setShowAddModal(true); setSelectedPlatform('whatsapp'); }}
                  className="h-[100px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-green-500/40 hover:bg-green-50 dark:hover:bg-green-500/5 transition-all group"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-xl group-hover:text-green-600 transition-colors" style={{ color: 'var(--text-muted)' }}>+</span>
                  <span className="text-xs group-hover:text-green-600 transition-colors" style={{ color: 'var(--text-muted)' }}>Add WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Telegram Sessions Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Telegram Sessions</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {sessions.filter(s => s.platform === 'telegram_bot' || s.platform === 'telegram_userbot').length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.filter(s => s.platform === 'telegram_bot' || s.platform === 'telegram_userbot').map((session) => (
                  <SessionCard
                    key={session.id}
                    name={session.session_name}
                    phone={session.phone_number}
                    status={session.state === 'qr_pending' || session.state === 'pairing_sent' ? 'pending' : session.state}
                    lastActive={session.last_active ? new Date(session.last_active).toLocaleString() : 'Never'}
                    lastActiveRaw={session.last_active}
                    platform={session.platform}
                    sessionId={session.id}
                    onConnect={() => handleConnect(session)}
                    onDisconnect={() => handleDisconnectSession(session.id)}
                    onDelete={() => handleDeleteSession(session.id)}
                  />
                ))}
                <button
                  onClick={() => { setShowAddModal(true); setSelectedPlatform(null); }}
                  className="h-[100px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all group"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-xl group-hover:text-blue-600 transition-colors" style={{ color: 'var(--text-muted)' }}>+</span>
                  <span className="text-xs group-hover:text-blue-600 transition-colors" style={{ color: 'var(--text-muted)' }}>Add Telegram</span>
                </button>
              </div>
            </div>

            {/* Show empty state if no sessions at all */}
            {sessions.length === 0 && (
              <div className="text-center py-16 border-2 border-dashed rounded-2xl" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                <p className="text-4xl mb-3">🤖</p>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No sessions yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Add a WhatsApp or Telegram session to get started
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors"
                >
                  Add Your First Session
                </button>
              </div>
            )}
          </div>
        )}

        {/* How to Connect Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 border rounded-2xl" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <span className="text-blue-600 dark:text-blue-400 text-sm">?</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>How to Connect</span>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">1</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add a Session</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Click <span className="text-blue-600 dark:text-blue-400 font-medium">+ Add New Session</span> and choose your platform: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>WhatsApp</span>, <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Telegram Bot</span>, or <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Telegram Userbot</span>.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">2</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Authenticate</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>WhatsApp:</span> Enter your phone number and scan the QR code or enter pairing code. <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Telegram Bot:</span> Paste your @BotFather token. <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Userbot:</span> Enter API credentials from my.telegram.org.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">3</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Go Live</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Once connected, your bot is <span className="text-blue-600 dark:text-blue-400 font-medium">live</span>. Manage settings, view analytics, and configure auto-replies from the dashboard.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="border rounded-2xl shadow-xl p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {isOnboarding && !selectedPlatform && (
              <div className="mb-5 p-4 rounded-xl border bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20">
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Welcome to BotWave 👋
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Let&apos;s connect your first bot. Pick a platform below — WhatsApp, a Telegram bot via @BotFather, or a Telegram userbot via MTProto. You can switch between the BotWave shared proxy pool and your own proxy at any time.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    dismissOnboarding();
                    setShowAddModal(false);
                    window.location.href = '/dashboard';
                  }}
                  className="mt-3 text-xs underline hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Skip for now
                </button>
              </div>
            )}

            <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
              {isOnboarding ? 'Connect your first bot' : 'New Session'}
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-400/10 border border-red-200 dark:border-red-400/50 p-3 mb-4 rounded-xl">
                <p className="text-sm text-red-500">
                  Error: {error}
                </p>
              </div>
            )}

            {/* Step 1: Platform Selection */}
            {!selectedPlatform && (
              <div className="space-y-4">
                <PlatformSelector selected={selectedPlatform} onSelect={(p) => { setSelectedPlatform(p); setError(null); }} />
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setError(null); }}
                  className="w-full border p-3 text-sm font-medium rounded-xl transition-colors hover:bg-red-50 dark:hover:bg-red-400/10 text-red-500"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* WhatsApp Flow */}
            {selectedPlatform === 'whatsapp' && (
              <form onSubmit={handleAddSession} className="space-y-4">
                {!showConfirm ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setSelectedPlatform(null); setShowConfirm(false); setError(null); }}
                      className="text-sm hover:opacity-70 transition-colors mb-2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      &larr; Back to platforms
                    </button>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Session Name</label>
                      <input
                        type="text"
                        required
                        value={newSession.name}
                        onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                        className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                        placeholder="e.g. Personal"
                        disabled={isCreating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
                      <input
                        type="text"
                        required
                        value={newSession.phone}
                        onChange={(e) => setNewSession({ ...newSession, phone: e.target.value })}
                        className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                        placeholder="+2348012345678"
                        disabled={isCreating}
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Use international format with country code (e.g. +234 for Nigeria, +1 for US, +44 for UK)</p>
                    </div>

                    {/* Proxy Selection */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Connection Proxy</label>

                      {/* BYOP educational banner — explains downtime trade-off + "change anytime" */}
                      <div
                        className="rounded-xl p-3 border text-xs leading-relaxed"
                        style={{
                          background: 'rgba(59,130,246,0.06)',
                          borderColor: 'rgba(59,130,246,0.25)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          About proxies & uptime
                        </p>
                        <p>
                          WhatsApp&apos;s anti-abuse system can disconnect bots running on shared datacenter IPs within minutes — your bot stops responding and you have to re-pair.
                          Using <strong>your own proxy</strong> (residential or mobile) gives a dedicated IP and far better uptime.
                          The shared pool is fine for testing or low-volume use.
                        </p>
                        <p className="mt-1">
                          You can switch between shared and your own proxy <strong>anytime</strong> from this session&apos;s settings — no need to re-pair.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label
                          className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${proxyType === 'shared' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/5' : 'hover:border-blue-300 dark:hover:border-blue-500/30'}`}
                          style={{ borderColor: proxyType === 'shared' ? undefined : 'var(--border)' }}
                        >
                          <input
                            type="radio"
                            name="proxy_type"
                            value="shared"
                            checked={proxyType === 'shared'}
                            onChange={() => { setProxyType('shared'); setProxyTestResult(null); }}
                            className="mt-0.5 accent-blue-600"
                          />
                          <div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              BotWave shared proxy pool (free)
                            </span>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              Limited reliability for numbers outside the US, Canada, UK. Best for testing or low-volume use. May experience disconnections.
                            </p>
                          </div>
                        </label>
                        <label
                          className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${proxyType === 'custom' ? 'border-green-500 bg-green-50/50 dark:bg-green-500/5' : 'hover:border-green-300 dark:hover:border-green-500/30'}`}
                          style={{ borderColor: proxyType === 'custom' ? undefined : 'var(--border)' }}
                        >
                          <input
                            type="radio"
                            name="proxy_type"
                            value="custom"
                            checked={proxyType === 'custom'}
                            onChange={() => setProxyType('custom')}
                            className="mt-0.5 accent-green-600"
                          />
                          <div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              Bring your own proxy (recommended for production)
                            </span>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              Stable, dedicated connection. Works from any country. You provide the proxy details.
                            </p>
                          </div>
                        </label>
                      </div>

                      {proxyType === 'custom' && (
                        <div className="space-y-3 pl-1">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Proxy Host</label>
                              <input
                                type="text"
                                value={customProxy.host}
                                onChange={(e) => setCustomProxy({ ...customProxy, host: e.target.value })}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                                placeholder="proxy.example.com"
                                disabled={isCreating}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Port</label>
                              <input
                                type="text"
                                value={customProxy.port}
                                onChange={(e) => setCustomProxy({ ...customProxy, port: e.target.value })}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                                placeholder="8080"
                                disabled={isCreating}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Username <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                              <input
                                type="text"
                                value={customProxy.username}
                                onChange={(e) => setCustomProxy({ ...customProxy, username: e.target.value })}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                                placeholder="user"
                                disabled={isCreating}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                              <input
                                type="password"
                                value={customProxy.password}
                                onChange={(e) => setCustomProxy({ ...customProxy, password: e.target.value })}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                                placeholder="pass"
                                disabled={isCreating}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!customProxy.host || !customProxy.port || proxyTesting}
                            onClick={async () => {
                              setProxyTesting(true);
                              setProxyTestResult(null);
                              try {
                                const res = await fetch('/api/bot/proxy-test', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(customProxy),
                                });
                                const data = await res.json();
                                setProxyTestResult({
                                  success: data.success,
                                  message: data.success ? data.message : data.error,
                                });
                              } catch {
                                setProxyTestResult({ success: false, message: 'Test request failed' });
                              } finally {
                                setProxyTesting(false);
                              }
                            }}
                            className="w-full border p-2 text-xs font-medium rounded-lg transition-colors hover:bg-green-50 dark:hover:bg-green-500/10 text-green-600 dark:text-green-400 disabled:opacity-50"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            {proxyTesting ? 'Testing...' : 'Test Proxy Connection'}
                          </button>

                          {proxyTestResult && (
                            <div className={`p-2 rounded-lg text-xs ${proxyTestResult.success ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-500/10 text-red-500'}`}>
                              {proxyTestResult.message}
                            </div>
                          )}

                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Need a proxy?{' '}
                            <a href="https://www.webshare.io/" target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 underline">
                              Get one from Webshare
                            </a>{' '}
                            — residential proxies as low as $0.0034/IP.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => { setShowAddModal(false); setSelectedPlatform(null); setShowConfirm(false); setError(null); }}
                        className="flex-1 border p-3 text-sm font-medium rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-400/10 disabled:opacity-50"
                        style={{ borderColor: 'var(--border)' }}
                        disabled={isCreating}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white p-3 text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isCreating || (proxyType === 'custom' && (!customProxy.host.trim() || !customProxy.port.trim()))}
                        title={proxyType === 'custom' && (!customProxy.host.trim() || !customProxy.port.trim()) ? 'Fill in proxy host and port, or switch to shared pool.' : undefined}
                      >
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 rounded-xl">
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-3">Confirm Session Details</p>
                      <div className="space-y-2">
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Name: <span className="text-blue-600 dark:text-blue-400 font-medium">{newSession.name}</span></p>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Phone: <span className="text-blue-600 dark:text-blue-400 font-medium">{newSession.phone}</span></p>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Proxy: <span className={`font-medium ${proxyType === 'custom' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>{proxyType === 'custom' ? `Custom (${customProxy.host}:${customProxy.port})` : 'Shared pool'}</span></p>
                      </div>
                      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                        Please verify this is the correct WhatsApp number you want to connect. Make sure it includes your country code.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 border border-yellow-300 dark:border-yellow-500/50 text-yellow-600 dark:text-yellow-500 p-3 text-sm font-medium rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-500/10"
                      >
                        Go Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white p-3 text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isCreating}
                      >
                        {isCreating ? 'Creating...' : 'Confirm & Create'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* Telegram Bot Flow */}
            {selectedPlatform === 'telegram_bot' && (
              <TelegramBotSetup
                onComplete={handleTelegramBotComplete}
                onCancel={() => { setSelectedPlatform(null); setError(null); }}
              />
            )}

            {/* Telegram Userbot Flow */}
            {selectedPlatform === 'telegram_userbot' && (
              <TelegramUserbotSetup
                onComplete={handleUserbotComplete}
                onCancel={() => { setSelectedPlatform(null); setError(null); }}
              />
            )}

            {isCreating && selectedPlatform !== 'whatsapp' && (
              <div className="text-center py-4">
                <div className="animate-pulse text-sm text-blue-600 dark:text-blue-400">Creating session...</div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {showQR && activeSession?.platform !== 'telegram_bot' && activeSession?.platform !== 'telegram_userbot' && (
        <QRCodeDisplay
          onClose={() => {
            setShowQR(false);
            fetchSessions();
          }}
          qrCode={activeSession?.qr_code}
          qrGeneratedAt={activeSession?.qr_generated_at}
          pairingCode={activeSession?.pairing_code}
          sessionState={activeSession?.state}
          queuePosition={activeSession?.queue_position}
          onRegenerate={activeSession ? async () => {
            try {
              const r = await fetch('/api/bot/sessions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: activeSession.id }),
              });
              const d = await r.json();
              if (d.success && d.data) {
                setActiveSession(d.data);
              }
              await fetchSessions();
            } catch (err) {
              console.error('Regenerate failed:', err);
            }
          } : undefined}
        />
      )}
    </main>
  );
}

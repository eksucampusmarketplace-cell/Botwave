'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import DashboardNav from '@/components/layout/DashboardNav';
import QRCodeDisplay from '@/components/ui/QRCodeDisplay';
import FeatureToggle from '@/components/ui/FeatureToggle';
import SessionCard from '@/components/ui/SessionCard';
import BotStatus from '@/components/ui/BotStatus';
import PlatformSelector from '@/components/ui/PlatformSelector';
import TelegramBotSetup from '@/components/ui/TelegramBotSetup';
import TelegramUserbotSetup from '@/components/ui/TelegramUserbotSetup';

import { createClient } from '@/lib/supabase/client';
import ParticleBackground from '@/components/ui/ParticleBackground';
import OnboardingTour from '@/components/ui/OnboardingTour';
import SessionAlerts from '@/components/ui/SessionAlerts';
import SessionHealthWidget from '@/components/ui/SessionHealthWidget';
import type { BotSession, BotFeature, DashboardStats, Platform } from '@/lib/types';
import { useSSE } from '@/lib/useSSE';

// Features that default to OFF - must be explicitly enabled by the user
const FEATURES_DEFAULT_OFF = new Set(['welcome', 'captcha', 'nightmode', 'xp', 'federation', 'antiraid']);

type FeatureCategory = 'core' | 'protection' | 'moderation' | 'content' | 'media' | 'fun' | 'utility';

interface FeatureDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: FeatureCategory;
}

const featureCategories: { id: FeatureCategory; label: string; icon: string }[] = [
  { id: 'core', label: 'Core Features', icon: '\u2B50' },
  { id: 'protection', label: 'Protection & Security', icon: '\uD83D\uDEE1\uFE0F' },
  { id: 'moderation', label: 'Moderation & Admin', icon: '\uD83D\uDC6E' },
  { id: 'content', label: 'Content & Engagement', icon: '\uD83D\uDCAC' },
  { id: 'media', label: 'Media & Creative', icon: '\uD83C\uDFA8' },
  { id: 'fun', label: 'Fun & Games', icon: '\uD83C\uDFAE' },
  { id: 'utility', label: 'Utilities & Tools', icon: '\uD83D\uDD27' },
];

interface FeatureDefWithPlatform extends FeatureDef {
  platforms: Platform[];
}

const defaultFeatures: FeatureDefWithPlatform[] = [
  // Core - WhatsApp
  { id: 'ai_chat', name: 'AI CHAT', description: 'Intelligent AI responses (Gemini)', icon: '\uD83E\uDD16', category: 'core', platforms: ['whatsapp'] },
  { id: 'sticker', name: 'STICKER MAKER', description: 'Convert images to stickers', icon: '\uD83C\uDCB4', category: 'core', platforms: ['whatsapp'] },
  { id: 'downloader', name: 'MEDIA DOWNLOADER', description: 'Download from YT, TT, IG', icon: '\uD83D\uDCE5', category: 'core', platforms: ['whatsapp'] },
  { id: 'auto_reply', name: 'AUTO REPLY', description: 'Set custom auto responses', icon: '\uD83D\uDCAC', category: 'core', platforms: ['whatsapp'] },
  { id: 'language', name: 'MULTI-LANGUAGE', description: 'Multi-language bot responses', icon: '\uD83C\uDF10', category: 'core', platforms: ['whatsapp'] },

  // Protection - WhatsApp
  { id: 'anti_spam', name: 'ANTI-SPAM', description: 'Block spam and floods', icon: '\uD83D\uDEE1\uFE0F', category: 'protection', platforms: ['whatsapp'] },

  // Content & Engagement - WhatsApp
  { id: 'polls', name: 'POLLS & LEADERBOARD', description: 'Create polls and track scores', icon: '\uD83D\uDCCA', category: 'content', platforms: ['whatsapp'] },

  // Media & Creative - WhatsApp
  { id: 'media_convert', name: 'MEDIA & CONVERSION', description: 'viewonce, toimg, togif, toaudio, ocr', icon: '\uD83D\uDD04', category: 'media', platforms: ['whatsapp'] },
  { id: 'image_editing', name: 'IMAGE EDITING', description: 'blur, grayscale, rotate, resize, crop', icon: '\uD83D\uDDBC\uFE0F', category: 'media', platforms: ['whatsapp'] },
  { id: 'profile', name: 'PROFILE TOOLS', description: 'bio, setpp, read, savestatus', icon: '\uD83D\uDC64', category: 'media', platforms: ['whatsapp'] },

  // Fun & Games - WhatsApp
  { id: 'games', name: 'MINI GAMES', description: 'Trivia, Hangman, WordChain, Chess', icon: '\uD83C\uDFAE', category: 'fun', platforms: ['whatsapp'] },
  { id: 'tools', name: 'FUN COMMANDS', description: 'Jokes, quotes, memes, 8ball, fortune', icon: '\uD83C\uDF89', category: 'fun', platforms: ['whatsapp'] },
  { id: 'social', name: 'SOCIAL', description: 'forward, roast, ghost, ship, birthday', icon: '\uD83D\uDD17', category: 'fun', platforms: ['whatsapp'] },

  // Utility - WhatsApp
  { id: 'productivity', name: 'PRODUCTIVITY', description: 'calc, countdown, remind, schedule', icon: '\u26A1', category: 'utility', platforms: ['whatsapp'] },
  { id: 'info_lookup', name: 'INFO LOOKUP', description: 'crypto, ud, ip, npm, whois, country', icon: '\uD83D\uDD0D', category: 'utility', platforms: ['whatsapp'] },
  { id: 'text_tools', name: 'TEXT & WRITING', description: 'reverse, mock, morse, font, ascii', icon: '\u270D\uFE0F', category: 'utility', platforms: ['whatsapp'] },
  { id: 'utilities', name: 'QUICK UTILITIES', description: 'pick, dice, password, uuid, unit, bmi', icon: '\uD83D\uDD27', category: 'utility', platforms: ['whatsapp'] },
];

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
  const [selectedFeatureSession, setSelectedFeatureSession] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [activeSession, setActiveSession] = useState<BotSession | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', phone: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ totalMessages: 0, totalCommands: 0, uptimePercent: 0, activeSessions: 0, totalSessions: 0 });
  const [expandedCategory, setExpandedCategory] = useState<FeatureCategory | null>('core');
  const [showOwnerSettings, setShowOwnerSettings] = useState(false);
  const [ownerConfig, setOwnerConfig] = useState({
    warnLimit: 3,
    warnAction: 'mute' as string,
    antifloodMax: 10,
    logChannelId: '',
    miniAppBaseUrl: 'https://botwave.online',
    antiraidThreshold: 15,
    antiraidMode: 'restrict' as string,
    antiraidDuration: 15,
  });
  const [savingOwnerConfig, setSavingOwnerConfig] = useState(false);
  const [ownerConfigSaved, setOwnerConfigSaved] = useState(false);

  const activeSessionRef = useRef<BotSession | null>(null);
  const [sseConnected, setSSEConnected] = useState(false);

  useSSE({
    onUpdate: (data) => {
      setSSEConnected(true);
      const mappedSessions = data.sessions.map((s) => ({
        ...s,
        user_id: '',
        created_at: '',
        updated_at: '',
      })) as BotSession[];
      setSessions(mappedSessions);

      const current = activeSessionRef.current;
      if (current) {
        const updated = mappedSessions.find((s) => s.id === current.id);
        if (updated) {
          setActiveSession(updated);
          activeSessionRef.current = updated;
        }
      }

      setStats((prev) => ({
        ...prev,
        totalMessages: data.stats.total_messages || prev.totalMessages,
        totalCommands: data.stats.total_commands || prev.totalCommands,
      }));
    },
    enabled: !showQR,
  });

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const sessRes = await fetch('/api/bot/sessions');
      const sessData = await sessRes.json();
      if (sessData.success) {
        setSessions(sessData.data);
        
        const currentActive = activeSessionRef.current;
        if (currentActive) {
          const updated = sessData.data.find((s: BotSession) => s.id === currentActive.id);
          if (updated) {
            setActiveSession(updated);
            activeSessionRef.current = updated;
          }
        }
      }

      const featUrl = selectedFeatureSession
        ? `/api/bot/features?sessionId=${selectedFeatureSession}`
        : '/api/bot/features';
      const [featRes, statsRes] = await Promise.all([
        fetch(featUrl),
        fetch('/api/bot/stats'),
      ]);
      const featData = await featRes.json();
      if (featData.success) {
        // Build set of explicitly enabled/disabled features from DB
        const dbFeatures = new Map(
          featData.data.map((f: BotFeature) => [f.feature_name, f.enabled])
        );
        // Features default to ON unless in FEATURES_DEFAULT_OFF set
        setActiveFeatures(defaultFeatures.filter(f => {
          if (dbFeatures.has(f.id)) return dbFeatures.get(f.id);
          return !FEATURES_DEFAULT_OFF.has(f.id);
        }).map(f => f.id));
      }
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats({
          totalMessages: statsData.data.totalMessages || 0,
          totalCommands: statsData.data.totalCommands || 0,
          uptimePercent: statsData.data.uptimePercent || 0,
          activeSessions: statsData.data.activeSessions || 0,
          totalSessions: statsData.data.totalSessions || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      fetchDashboardData();
    };
    checkUser();
  }, [fetchDashboardData]);

  // Force-pair onboarding: users with zero sessions get redirected to the
  // add-session flow on first dashboard visit so they actually connect a bot
  // instead of bouncing off an empty dashboard. Dismissable via localStorage.
  useEffect(() => {
    if (loading) return;
    if (sessions.length > 0) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem('botwave_welcome_dismissed')) return;
    window.location.href = '/dashboard/sessions?onboarding=1';
  }, [loading, sessions.length]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQR && activeSessionRef.current) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/bot/sessions');
          const data = await res.json();
          if (data.success) {
            setSessions(data.data);
            const refreshed = data.data.find((s: BotSession) => s.id === activeSessionRef.current?.id);
            if (refreshed) {
              setActiveSession(refreshed);
              activeSessionRef.current = refreshed;
              if (refreshed.state === 'active') {
                setShowQR(false);
              }
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showQR]);

  useEffect(() => {
    if (sessions.length > 0 && !selectedFeatureSession) {
      const whatsappSession = sessions.find(s => (s.platform || 'whatsapp') === 'whatsapp');
      setSelectedFeatureSession(whatsappSession?.id || sessions[0].id);
    }
  }, [sessions, selectedFeatureSession]);

  useEffect(() => {
    if (selectedFeatureSession) {
      fetch(`/api/bot/features?sessionId=${selectedFeatureSession}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const dbFeatures = new Map(
              data.data.map((f: BotFeature) => [f.feature_name, f.enabled])
            );
            setActiveFeatures(defaultFeatures.filter(f => {
              if (dbFeatures.has(f.id)) return dbFeatures.get(f.id);
              return !FEATURES_DEFAULT_OFF.has(f.id);
            }).map(f => f.id));
          }
        })
        .catch(err => console.error('Error fetching session features:', err));
    }
  }, [selectedFeatureSession]);

  const toggleFeature = async (featureId: string) => {
    const isEnabled = activeFeatures.includes(featureId);
    const newEnabled = !isEnabled;

    if (sessions.length === 0) {
      alert('Please create a session first');
      return;
    }

    setActiveFeatures((prev) =>
      isEnabled ? prev.filter((f) => f !== featureId) : [...prev, featureId]
    );

    const targetSession = selectedFeatureSession || sessions[0].id;
    try {
      await fetch('/api/bot/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: targetSession,
          featureName: featureId,
          enabled: newEnabled,
        }),
      });
    } catch (err) {
      console.error('Error updating feature:', err);
    }
  };

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
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setNewSession({ name: '', phone: '' });
        setSelectedPlatform(null);
        fetchDashboardData();
        setActiveSession(data.data);
        setShowQR(true);
      } else {
        setError(data.error || 'Failed to create session');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error creating session:', err);
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
        fetchDashboardData();
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
        fetchDashboardData();
      } else {
        setError(result.error || 'Failed to create userbot session');
      }
    } catch {
      setError('Failed to create userbot session');
    } finally {
      setIsCreating(false);
    }
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
        fetchDashboardData();
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
        fetchDashboardData();
      } else {
        setError(data.error || 'Failed to delete session');
      }
    } catch {
      setError('Failed to delete session');
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
          fetchDashboardData();
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
    if (session.state === 'needs_reauth' || session.state === 'inactive' || session.state === 'pairing_failed') {
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

  return (
    <main className="min-h-screen bg-[var(--bg)] relative">
      <ParticleBackground />
      <DashboardNav />
      <OnboardingTour />
      <SessionAlerts />
      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${sessions.some(s => s.state === 'active') ? 'bg-green-500' : sessions.some(s => s.state === 'needs_reauth') ? 'bg-yellow-500' : 'bg-red-400'}`} />
            <span className={`text-sm font-medium ${sessions.some(s => s.state === 'active') ? 'text-green-600 dark:text-green-400' : sessions.some(s => s.state === 'needs_reauth') ? 'text-yellow-600 dark:text-yellow-500' : 'text-red-500 dark:text-red-400'}`}>
              {sessions.some(s => s.state === 'active') ? 'System Active' : sessions.some(s => s.state === 'needs_reauth') ? 'Reconnect Required' : sessions.length > 0 ? 'System Offline' : 'No Sessions'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Panel</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-base text-[var(--text-secondary)]">
              Manage your WhatsApp &amp; Telegram sessions and bot features
            </p>
            {sseConnected && (
              <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </motion.div>

        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 mb-6 rounded-xl">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Your bot runs 24/7 on BotWave&apos;s servers. You do not need to keep this app open or keep your phone on. Your session stays active as long as you remain connected.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            <motion.section
              data-tour="sessions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-6 rounded-2xl shadow-sm"
            >
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">
                Sessions
              </h2>

              <div className="space-y-4">
                {sessions.map((session) => (
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
                  data-tour="add-session"
                  onClick={() => setShowAddModal(true)}
                  className="w-full border-2 border-dashed border-[var(--border)] p-4 rounded-xl text-center text-sm text-[var(--text-muted)] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium"
                >
                  + Add New Session
                </button>
              </div>
            </motion.section>

            {/* Quick links to new features */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-6 rounded-2xl shadow-sm"
            >
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Tools</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  { href: '/dashboard/templates', icon: '\uD83D\uDCDD', label: 'Templates', desc: 'Reusable message snippets with variables', platforms: ['whatsapp'] as Platform[] },
                  { href: '/dashboard/custom-commands', icon: '\uD83E\uDD16', label: 'Commands', desc: 'Custom trigger \u2192 response pairs', platforms: ['whatsapp'] as Platform[] },
                  { href: '/dashboard/flows', icon: '\uD83D\uDD00', label: 'Flows', desc: 'Multi-step conversation sequences', platforms: ['whatsapp'] as Platform[] },
                  { href: '/dashboard/rate-limits', icon: '\uD83D\uDCCA', label: 'Rate Limits', platforms: ['whatsapp', 'telegram_bot', 'telegram_userbot'] as Platform[] },
                  { href: '/dashboard/group-analytics', icon: '\uD83D\uDCC8', label: 'Analytics', platforms: ['whatsapp', 'telegram_bot', 'telegram_userbot'] as Platform[] },
                  { href: '/dashboard/shop', icon: '\uD83D\uDED2', label: 'Shop', platforms: ['whatsapp', 'telegram_bot', 'telegram_userbot'] as Platform[] },
                  { href: '/dashboard/referrals', icon: '\uD83D\uDD17', label: 'Referrals', platforms: ['whatsapp', 'telegram_bot', 'telegram_userbot'] as Platform[] },
                  { href: '/dashboard/pricing', icon: '\uD83D\uDCB3', label: 'Pricing', platforms: ['whatsapp', 'telegram_bot', 'telegram_userbot'] as Platform[] },
                  { href: '/dashboard/rewards', icon: '\uD83C\uDF81', label: 'Rewards', platforms: ['whatsapp', 'telegram_bot', 'telegram_userbot'] as Platform[] },
                ]).filter(link => {
                  const activePlatforms = sessions.map(s => s.platform || 'whatsapp');
                  return link.platforms.some(p => activePlatforms.includes(p));
                }).map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex flex-col gap-1 p-3 border border-[var(--border)] rounded-xl hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors text-sm text-[var(--text-secondary)]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{link.icon}</span>
                      {link.label}
                    </span>
                    {'desc' in link && link.desc && (
                      <span className="text-xs text-[var(--text-muted)]">{link.desc}</span>
                    )}
                  </a>
                ))}
              </div>
            </motion.section>

            {/* Support & Community */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.17 }}
              className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-6 rounded-2xl shadow-sm"
            >
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Support &amp; Community</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href="https://chat.whatsapp.com/GMyXXv1hhnbI7JcCF5sNEf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-green-400/30 hover:border-green-400 rounded-xl transition-all hover:-translate-y-0.5"
                >
                  <span className="text-2xl">{'\u{1F4AC}'}</span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">WhatsApp Support</div>
                    <div className="text-xs text-[var(--text-muted)]">Get help from the community</div>
                  </div>
                </a>
                <a
                  href="https://t.me/botwavegrp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-blue-400/30 hover:border-blue-400 rounded-xl transition-all hover:-translate-y-0.5"
                >
                  <span className="text-2xl">{'\u2708\uFE0F'}</span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Telegram Support</div>
                    <div className="text-xs text-[var(--text-muted)]">Chat with other users</div>
                  </div>
                </a>
                <a
                  href="https://t.me/BotWaveUpdates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-violet-400/30 hover:border-violet-400 rounded-xl transition-all hover:-translate-y-0.5"
                >
                  <span className="text-2xl">{'\u{1F4E2}'}</span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Updates Channel</div>
                    <div className="text-xs text-[var(--text-muted)]">Latest releases &amp; news</div>
                  </div>
                </a>
              </div>
            </motion.section>

            <motion.section
              data-tour="features"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-6 rounded-2xl shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Feature Toggles
                </h2>
                {sessions.length > 1 && (
                  <select
                    value={selectedFeatureSession}
                    onChange={(e) => setSelectedFeatureSession(e.target.value)}
                    className="bg-[var(--bg)] border border-[var(--border)] px-3 py-1.5 text-[var(--text-primary)] text-sm rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.session_name} ({s.phone_number})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {(() => {
                const selectedSession = sessions.find(s => s.id === selectedFeatureSession);
                const isTelegram = selectedSession?.platform === 'telegram_bot' || selectedSession?.platform === 'telegram_userbot';
                const sessionPlatform: Platform = selectedSession?.platform || 'whatsapp';

                if (isTelegram) {
                  return (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-sm text-[var(--text-secondary)]">
                        Telegram bot features are managed from the Telegram configure panel.
                      </p>
                      <Link
                        href={`/dashboard/telegram/${selectedFeatureSession}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Configure Telegram Bot &rarr;
                      </Link>
                    </div>
                  );
                }

                return featureCategories.map((cat) => {
                  const catFeatures = defaultFeatures.filter(f => f.category === cat.id && f.platforms.includes(sessionPlatform));
                  if (!catFeatures.length) return null;
                  const isExpanded = expandedCategory === cat.id;
                  const enabledCount = catFeatures.filter(f => activeFeatures.includes(f.id)).length;
                  return (
                    <div key={cat.id} className="mb-3">
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-blue-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cat.icon}</span>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{cat.label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                            {enabledCount}/{catFeatures.length}
                          </span>
                        </div>
                        <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pl-2">
                          {catFeatures.map((feature, index) => (
                            <FeatureToggle
                              key={feature.id}
                              feature={feature}
                              enabled={activeFeatures.includes(feature.id)}
                              onToggle={() => toggleFeature(feature.id)}
                              index={index}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </motion.section>

            {/* Bot Owner Settings - only visible when a Telegram session is selected */}
            {(() => {
              const selectedSession = sessions.find(s => s.id === selectedFeatureSession);
              const isTelegramSession = selectedSession?.platform === 'telegram_bot' || selectedSession?.platform === 'telegram_userbot';
              if (!isTelegramSession) return null;
              return (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-6 rounded-2xl shadow-sm"
            >
              <button
                onClick={() => setShowOwnerSettings(!showOwnerSettings)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="text-xl">\u2699\uFE0F</span> Bot Owner Settings
                </h2>
                <svg className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${showOwnerSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Features you disable here will be completely hidden from group admins.
              </p>

              {showOwnerSettings && (
                <div className="mt-6 space-y-6">
                  {/* Warning Settings */}
                  <div className="bg-[var(--bg)] border border-[var(--border)] p-4 rounded-xl">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <span>\u26A0\uFE0F</span> Warning System
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Warn Limit</label>
                        <input type="number" min={1} max={20} value={ownerConfig.warnLimit}
                          onChange={(e) => setOwnerConfig(p => ({ ...p, warnLimit: Number(e.target.value) || 3 }))}
                          className="w-full bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-2 rounded-lg text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Warn Action</label>
                        <select value={ownerConfig.warnAction}
                          onChange={(e) => setOwnerConfig(p => ({ ...p, warnAction: e.target.value }))}
                          className="w-full bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-2 rounded-lg text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none">
                          <option value="mute">Mute</option>
                          <option value="kick">Kick</option>
                          <option value="ban">Ban</option>
                          <option value="tban">Temp Ban</option>
                          <option value="tmute">Temp Mute</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Anti-Flood Settings */}
                  <div className="bg-[var(--bg)] border border-[var(--border)] p-4 rounded-xl">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <span>\uD83C\uDF0A</span> Anti-Flood Settings
                    </h3>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Max Messages Per Minute</label>
                      <input type="number" min={1} max={100} value={ownerConfig.antifloodMax}
                        onChange={(e) => setOwnerConfig(p => ({ ...p, antifloodMax: Number(e.target.value) || 10 }))}
                        className="w-full bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-2 rounded-lg text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none" />
                    </div>
                  </div>

                  {/* Anti-Raid Settings */}
                  <div className="bg-[var(--bg)] border border-[var(--border)] p-4 rounded-xl">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <span>\uD83D\uDEA8</span> Anti-Raid Settings
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Threshold (joins/min)</label>
                        <input type="number" min={1} max={100} value={ownerConfig.antiraidThreshold}
                          onChange={(e) => setOwnerConfig(p => ({ ...p, antiraidThreshold: Number(e.target.value) || 15 }))}
                          className="w-full bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-2 rounded-lg text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Mode</label>
                        <select value={ownerConfig.antiraidMode}
                          onChange={(e) => setOwnerConfig(p => ({ ...p, antiraidMode: e.target.value }))}
                          className="w-full bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-2 rounded-lg text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none">
                          <option value="restrict">Restrict</option>
                          <option value="ban">Ban</option>
                          <option value="kick">Kick</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Duration (min)</label>
                        <input type="number" min={1} max={1440} value={ownerConfig.antiraidDuration}
                          onChange={(e) => setOwnerConfig(p => ({ ...p, antiraidDuration: Number(e.target.value) || 15 }))}
                          className="w-full bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-2 rounded-lg text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Log Channel & Mini App */}
                  <div className="bg-[var(--bg)] border border-[var(--border)] p-4 rounded-xl">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <span>\uD83D\uDCCB</span> Logging & Integration
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Log Channel ID</label>
                        <input type="text" value={ownerConfig.logChannelId} placeholder="e.g. -1001234567890"
                          onChange={(e) => setOwnerConfig(p => ({ ...p, logChannelId: e.target.value }))}
                          className="w-full bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-2 rounded-lg text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Mini App Base URL</label>
                        <input type="text" value={ownerConfig.miniAppBaseUrl} placeholder="https://botwave.online"
                          onChange={(e) => setOwnerConfig(p => ({ ...p, miniAppBaseUrl: e.target.value }))}
                          className="w-full bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-2 rounded-lg text-sm text-[var(--text-primary)] focus:border-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!sessions.length) { alert('Create a session first'); return; }
                      setSavingOwnerConfig(true);
                      try {
                        const targetSession = selectedFeatureSession || sessions[0].id;
                        await fetch('/api/bot/features', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            sessionId: targetSession,
                            featureName: '_owner_config',
                            enabled: true,
                            config: ownerConfig,
                          }),
                        });
                        setOwnerConfigSaved(true);
                        setTimeout(() => setOwnerConfigSaved(false), 3000);
                      } catch (err) {
                        console.error('Error saving owner config:', err);
                      } finally {
                        setSavingOwnerConfig(false);
                      }
                    }}
                    disabled={savingOwnerConfig}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {savingOwnerConfig ? 'Saving...' : ownerConfigSaved ? 'Settings Saved!' : 'Save Settings'}
                  </button>
                </div>
              )}
            </motion.section>
              );
            })()}
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <SessionHealthWidget
                total={sessions.length}
                active={sessions.filter(s => s.state === 'active').length}
                needsReauth={sessions.filter(s => s.state === 'needs_reauth').length}
                pairingSent={sessions.filter(s => s.state === 'pairing_sent').length}
                qrPending={sessions.filter(s => s.state === 'qr_pending').length}
                inactive={sessions.filter(s => s.state === 'inactive').length}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <BotStatus
                isActive={sessions.some(s => s.state === 'active')}
                sessionCount={sessions.length}
                needsReauth={sessions.filter(s => s.state === 'needs_reauth').length}
                totalMessages={stats.totalMessages}
                totalCommands={stats.totalCommands}
                uptimePercent={stats.uptimePercent}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-6 rounded-2xl shadow-sm"
            >
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6" data-tour="stats">
                Quick Stats
              </h2>

              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)] font-medium">Messages</span>
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">{stats.totalMessages.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)] font-medium">Commands</span>
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">{stats.totalCommands.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)] font-medium">Uptime</span>
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-600">{stats.uptimePercent}%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--card-bg,var(--surface))] border border-[var(--border)] p-5 sm:p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl"
          >
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">New Session</h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-400/10 border border-red-200 dark:border-red-400/30 p-3 mb-4 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error: {error}
                </p>
              </div>
            )}

            {/* Step 1: Platform Selection */}
            {!selectedPlatform && (
              <div className="space-y-4">
                <PlatformSelector
                  selected={selectedPlatform}
                  onSelect={(p) => {
                    // WhatsApp pairing needs the BYOP / shared-pool proxy
                    // chooser — which only lives on /dashboard/sessions today.
                    // Send the user there so they can pick a working proxy
                    // instead of failing silently on the dead shared pool.
                    if (p === 'whatsapp') {
                      setShowAddModal(false);
                      setError(null);
                      router.push('/dashboard/sessions?onboarding=1');
                      return;
                    }
                    setSelectedPlatform(p);
                    setError(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setError(null); }}
                  className="w-full border border-red-300 dark:border-red-400/50 text-red-500 dark:text-red-400 p-3 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-400/10 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            )}

            {/* WhatsApp Flow */}
            {selectedPlatform === 'whatsapp' && (
              <form onSubmit={handleAddSession} className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setSelectedPlatform(null); setShowConfirm(false); setError(null); }}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-2"
                >
                  &larr; Back to platforms
                </button>
                {!showConfirm ? (
                  <>
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Session Name</label>
                      <input
                        type="text"
                        required
                        value={newSession.name}
                        onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-[var(--text-primary)] text-sm rounded-xl focus:border-blue-500 outline-none transition-colors"
                        placeholder="e.g. Personal"
                        disabled={isCreating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1.5 font-medium">Phone Number</label>
                      <input
                        type="text"
                        required
                        value={newSession.phone}
                        onChange={(e) => setNewSession({ ...newSession, phone: e.target.value })}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] p-3 text-[var(--text-primary)] text-sm rounded-xl focus:border-blue-500 outline-none transition-colors"
                        placeholder="+2348012345678"
                        disabled={isCreating}
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1.5">Use international format with country code (e.g. +234 for Nigeria, +1 for US, +44 for UK)</p>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => { setSelectedPlatform(null); setShowConfirm(false); setError(null); }}
                        className="flex-1 border border-[var(--border)] text-[var(--text-secondary)] p-3 rounded-xl text-sm font-medium hover:bg-[var(--bg-alt)] disabled:opacity-50 transition-colors"
                        disabled={isCreating}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white p-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isCreating}
                      >
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 rounded-xl">
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold mb-3">Confirm Session Details</p>
                      <div className="space-y-2">
                        <p className="text-sm text-[var(--text-primary)]">Name: <span className="font-semibold text-blue-600 dark:text-blue-400">{newSession.name}</span></p>
                        <p className="text-sm text-[var(--text-primary)]">Phone: <span className="font-semibold text-blue-600 dark:text-blue-400">{newSession.phone}</span></p>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-3">
                        Please verify this is the correct WhatsApp number you want to connect. Make sure it includes your country code.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 border border-[var(--border)] text-[var(--text-secondary)] p-3 rounded-xl text-sm font-medium hover:bg-[var(--bg-alt)] transition-colors"
                      >
                        Go Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white p-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setSelectedPlatform(null); setError(null); }}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-2"
                >
                  &larr; Back to platforms
                </button>
                <TelegramBotSetup
                  onComplete={handleTelegramBotComplete}
                  onCancel={() => { setSelectedPlatform(null); setError(null); }}
                />
              </div>
            )}

            {/* Telegram Userbot Flow */}
            {selectedPlatform === 'telegram_userbot' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setSelectedPlatform(null); setError(null); }}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-2"
                >
                  &larr; Back to platforms
                </button>
                <TelegramUserbotSetup
                  onComplete={handleUserbotComplete}
                  onCancel={() => { setSelectedPlatform(null); setError(null); }}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}

      {showQR && activeSession?.platform !== 'telegram_bot' && activeSession?.platform !== 'telegram_userbot' && (
        <QRCodeDisplay
          onClose={() => {
            setShowQR(false);
            fetchDashboardData();
          }}
          qrCode={activeSession?.qr_code}
          qrGeneratedAt={activeSession?.qr_generated_at}
          pairingCode={activeSession?.pairing_code}
          sessionState={activeSession?.state}
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
              await fetchDashboardData(true);
            } catch (err) {
              console.error('Regenerate failed:', err);
            }
          } : undefined}
        />
      )}


    </main>
  );
}

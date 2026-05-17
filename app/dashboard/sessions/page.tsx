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

  const supabase = useRef(createClient()).current;
  const activeSessionRef = useRef<BotSession | null>(null);

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
          // Fallback to session check — getUser makes a network call that can fail
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            window.location.href = '/login';
            return;
          }
        }
      } catch {
        // Network error — middleware already validated auth, proceed
        console.warn('[Sessions] Auth check failed (network error) — staying on page');
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
      }, 2000);
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
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setNewSession({ name: '', phone: '' });
        setSelectedPlatform(null);
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
    // For disconnected sessions, reset state so the worker generates a fresh pairing code
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
    <main className="min-h-screen bg-dark relative">
      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        {sessions.some(s => s.state === 'needs_reauth') && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-red-950/20 border-2 border-red-600 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div>
              <h3 className="font-display text-lg text-red-600 font-bold tracking-wider">ACTION REQUIRED: SESSION DISCONNECTED</h3>
              <p className="font-mono text-xs text-zinc-400 mt-1">
                One or more of your sessions have been disconnected. Re-authenticate to resume service.
              </p>
            </div>
            <button 
              onClick={() => {
                const session = sessions.find(s => s.state === 'needs_reauth');
                if (session) handleConnect(session);
              }}
              className="px-6 py-3 bg-red-600 text-white font-mono text-xs font-bold tracking-widest hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              RECONNECT NOW
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[2px]">
            BOT <span className="text-green">SESSIONS</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Manage your connected WhatsApp &amp; Telegram sessions
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center font-mono text-green py-12">
              LOADING_SESSIONS...
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                name={session.session_name}
                phone={session.phone_number}
                status={session.state === 'qr_pending' || session.state === 'pairing_sent' ? 'pending' : session.state}
                lastActive={session.last_active ? new Date(session.last_active).toLocaleString() : 'Never'}
                platform={session.platform}
                onConnect={() => handleConnect(session)}
                onDisconnect={() => handleDisconnectSession(session.id)}
                onDelete={() => handleDeleteSession(session.id)}
              />
            ))
          ) : (
            <div className="col-span-full text-center font-mono text-[#5a9a7a] py-12 border-2 border-dashed border-green/10">
              NO_SESSIONS_FOUND
            </div>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="h-[120px] border-2 border-dashed border-green/20 flex flex-col items-center justify-center gap-2 hover:border-green/40 hover:bg-green/5 transition-all group"
          >
            <span className="text-2xl text-[#5a9a7a] group-hover:text-green transition-colors">+</span>
            <span className="font-mono text-xs text-[#5a9a7a] group-hover:text-green tracking-[2px]">ADD NEW SESSION</span>
          </button>
        </div>

        {/* How to Connect Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 border border-green/15 bg-[#0a0f0a]"
        >
          <div className="px-5 py-3 border-b border-green/15 flex items-center gap-2">
            <span className="text-green text-sm">?</span>
            <span className="font-mono text-[11px] text-green/70 tracking-[2px]">HOW TO CONNECT</span>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg text-cyan font-bold">1</span>
                <span className="font-mono text-xs text-white font-bold tracking-[1px]">ADD A SESSION</span>
              </div>
              <p className="font-mono text-[11px] text-[#5a9a7a] leading-relaxed">
                Click <span className="text-green">+ ADD NEW SESSION</span> and choose your platform: <span className="text-white">WhatsApp</span>, <span className="text-white">Telegram Bot</span>, or <span className="text-white">Telegram Userbot</span>.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg text-cyan font-bold">2</span>
                <span className="font-mono text-xs text-white font-bold tracking-[1px]">AUTHENTICATE</span>
              </div>
              <p className="font-mono text-[11px] text-[#5a9a7a] leading-relaxed">
                <span className="text-white">WhatsApp:</span> Enter your phone number and scan the QR code or enter pairing code. <span className="text-white">Telegram Bot:</span> Paste your @BotFather token. <span className="text-white">Userbot:</span> Enter API credentials from my.telegram.org.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg text-cyan font-bold">3</span>
                <span className="font-mono text-xs text-white font-bold tracking-[1px]">GO LIVE</span>
              </div>
              <p className="font-mono text-[11px] text-[#5a9a7a] leading-relaxed">
                Once connected, your bot is <span className="text-green">live</span>. Manage settings, view analytics, and configure auto-replies from the dashboard.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-dark/90 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-green/20 p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto"
          >
            <h2 className="font-display text-xl text-green mb-6 tracking-[2px]">NEW SESSION</h2>

            {error && (
              <div className="bg-red-400/10 border border-red-400/50 p-3 mb-4">
                <p className="font-mono text-[10px] text-red-400 tracking-[1px] uppercase">
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
                  className="w-full border border-red-400/50 text-red-400 p-3 font-mono text-xs tracking-[2px] hover:bg-red-400/10"
                >
                  CANCEL
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
                      className="font-mono text-[10px] text-[#5a9a7a] hover:text-white transition-colors mb-2"
                    >
                      &larr; BACK TO PLATFORMS
                    </button>
                    <div>
                      <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">SESSION NAME</label>
                      <input
                        type="text"
                        required
                        value={newSession.name}
                        onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                        className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                        placeholder="e.g. Personal"
                        disabled={isCreating}
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">PHONE NUMBER</label>
                      <input
                        type="text"
                        required
                        value={newSession.phone}
                        onChange={(e) => setNewSession({ ...newSession, phone: e.target.value })}
                        className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                        placeholder="+2348012345678"
                        disabled={isCreating}
                      />
                      <p className="font-mono text-[9px] text-[#5a9a7a]/60 mt-1">Use international format with country code (e.g. +234 for Nigeria, +1 for US, +44 for UK)</p>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => { setShowAddModal(false); setSelectedPlatform(null); setShowConfirm(false); setError(null); }}
                        className="flex-1 border border-red-400/50 text-red-400 p-3 font-mono text-xs tracking-[2px] hover:bg-red-400/10 disabled:opacity-50"
                        disabled={isCreating}
                      >
                        CANCEL
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-green text-dark p-3 font-mono text-xs font-bold tracking-[2px] hover:bg-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isCreating}
                      >
                        CONTINUE
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-cyan/10 border border-cyan/30 p-4">
                      <p className="font-mono text-xs text-cyan tracking-[1px] mb-3">CONFIRM SESSION DETAILS</p>
                      <div className="space-y-2">
                        <p className="font-mono text-xs text-white">Name: <span className="text-green">{newSession.name}</span></p>
                        <p className="font-mono text-xs text-white">Phone: <span className="text-green">{newSession.phone}</span></p>
                      </div>
                      <p className="font-mono text-[10px] text-[#5a9a7a] mt-3">
                        Please verify this is the correct WhatsApp number you want to connect. Make sure it includes your country code.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 border border-yellow-500/50 text-yellow-500 p-3 font-mono text-xs tracking-[2px] hover:bg-yellow-500/10"
                      >
                        GO BACK
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-green text-dark p-3 font-mono text-xs font-bold tracking-[2px] hover:bg-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isCreating}
                      >
                        {isCreating ? 'CREATING...' : 'CONFIRM & CREATE'}
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
                <div className="animate-pulse font-mono text-xs text-green">CREATING SESSION...</div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {showQR && (
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
        />
      )}
    </main>
  );
}

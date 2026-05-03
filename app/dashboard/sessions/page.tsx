'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import SessionCard from '@/components/ui/SessionCard';
import QRCodeDisplay from '@/components/ui/QRCodeDisplay';
import { createClient } from '@/lib/supabase/client';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', phone: '' });

  const supabase = useRef(createClient()).current;
  const activeSessionRef = useRef<any>(null);

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/bot/sessions');
      const data = await response.json();
      if (data.success) {
        setSessions(data.data);
        
        const currentActive = activeSessionRef.current;
        if (currentActive) {
          const updated = data.data.find((s: any) => s.id === currentActive.id);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
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
      interval = setInterval(() => {
        fetchSessions(true);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [showQR, fetchSessions]);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/bot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: newSession.name,
          phoneNumber: newSession.phone,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setNewSession({ name: '', phone: '' });
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

  const handleConnect = (session: any) => {
    setActiveSession(session);
    setShowQR(true);
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
                One or more of your sessions have been disconnected by WhatsApp. Re-authenticate to resume service.
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
            Manage your connected WhatsApp numbers
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
                status={session.state === 'qr_pending' ? 'pending' : session.state}
                lastActive={session.last_active ? new Date(session.last_active).toLocaleString() : 'Never'}
                onConnect={() => handleConnect(session)}
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
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-dark/90 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-green/20 p-8 max-w-md w-full relative"
          >
            <h2 className="font-display text-xl text-green mb-6 tracking-[2px]">NEW SESSION</h2>
            <form onSubmit={handleAddSession} className="space-y-4">
              {error && (
                <div className="bg-red-400/10 border border-red-400/50 p-3 mb-4">
                  <p className="font-mono text-[10px] text-red-400 tracking-[1px] uppercase">
                    Error: {error}
                  </p>
                </div>
              )}
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
                  placeholder="+1234567890"
                  disabled={isCreating}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  {isCreating ? 'CREATING...' : 'CREATE'}
                </button>
              </div>
            </form>
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
        />
      )}
    </main>
  );
}

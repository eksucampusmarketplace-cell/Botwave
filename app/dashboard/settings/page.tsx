'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('User');

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      if (session.user) {
        setUsername(session.user.email || session.user.id);
        if (session.user.user_metadata?.openai_api_key) {
          setApiKey(session.user.user_metadata.openai_api_key);
        }
      }
    };
    checkUser();
  }, []);

  const handleSaveApiKey = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save API key');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllSessions = async () => {
    const confirmed = window.confirm(
      '⚠️ DANGER ZONE\n\nAre you sure you want to delete ALL sessions?\n\nThis action cannot be undone and will remove:\n• All WhatsApp connections\n• All session data\n• All message history\n\nClick OK to proceed or Cancel to abort.'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      '🚨 FINAL CONFIRMATION 🚨\n\nThis will permanently delete ALL your sessions.\n\nType "DELETE" in the next prompt to confirm.'
    );

    if (!doubleConfirm) return;

    const finalConfirm = prompt('Type DELETE to confirm:');
    if (finalConfirm !== 'DELETE') {
      alert('Deletion cancelled.');
      return;
    }

    try {
      const response = await fetch('/api/bot/sessions?all=true', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete sessions');
      }

      alert('✅ All sessions have been deleted successfully.');
      window.location.reload();
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-dark relative">
      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[2px]">
            SYSTEM <span className="text-green">SETTINGS</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Configure your global bot preferences
          </p>
        </motion.div>

        <div className="bg-card border border-green/10 p-8 relative">
          <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
          <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
          
          <div className="space-y-8 max-w-2xl">
            <div>
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">PROFILE</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">USERNAME</label>
                  <input
                    type="text"
                    disabled
                    value={username}
                    className="w-full bg-dark/50 border border-green/10 p-3 text-white font-mono text-sm"
                    placeholder="User"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">API CONFIGURATION</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">OPENAI API KEY</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                      placeholder="sk-..."
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={saving}
                      className="px-6 py-3 bg-green text-dark font-mono text-sm tracking-[2px] hover:bg-green/90 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'SAVING...' : 'SAVE'}
                    </button>
                  </div>
                  {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                  {saved && <p className="text-green text-xs mt-2">✓ API key saved successfully</p>}
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">OPENWEATHER API KEY</label>
                  <input
                    type="password"
                    className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                    placeholder="Optional - for #weather command"
                  />
                  <p className="text-[#5a9a7a]/60 text-xs mt-1">
                    Get your free API key at openweathermap.org
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm tracking-[3px] text-red-400 mb-4">DANGER ZONE</h3>
              <button
                onClick={handleDeleteAllSessions}
                className="border border-red-400/50 text-red-400 px-6 py-3 font-mono text-xs tracking-[2px] hover:bg-red-400/10 transition-colors"
              >
                DELETE ALL SESSIONS
              </button>
              <p className="text-red-400/60 text-xs mt-2">
                This action is irreversible. All session data will be permanently deleted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

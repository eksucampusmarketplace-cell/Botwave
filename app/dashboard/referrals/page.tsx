'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface ReferralData {
  code: string | null;
  totalReferred: number;
  totalEarned: number;
  isFrozen?: boolean;
  frozenReason?: string | null;
  notSetup?: boolean;
  referrals: { id: string; referred_email: string; reward_amount: number; status: string; flagged_reason?: string; created_at: string }[];
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyCode, setApplyCode] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [applyError, setApplyError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/user/referrals', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      console.error('Failed to load referral data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyCode = () => {
    if (data?.code) {
      navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = async () => {
    setApplyMsg('');
    setApplyError('');
    if (!applyCode.trim()) { setApplyError('Enter a referral code'); return; }

    const res = await fetch('/api/user/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code: applyCode.trim() }),
    });

    const json = await res.json();
    if (json.success) {
      setApplyMsg(json.message);
      setApplyCode('');
      fetchData();
    } else {
      setApplyError(json.error);
    }
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Referral Program
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Share your code and earn rewards when friends join BotWave
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Loading...</div>
          ) : !data ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Failed to load</div>
          ) : (
            <div className="space-y-6">
              {/* Frozen warning */}
              {data.isFrozen && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
                  <p className="text-sm font-medium text-red-400">Your referral code has been frozen</p>
                  <p className="text-xs text-red-400/70 mt-1">{data.frozenReason || 'Suspicious activity detected. Contact support if you believe this is an error.'}</p>
                </div>
              )}

              {/* Referral code card */}
              <div className="p-6 rounded-xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Your Referral Code</p>
                {data.code ? (
                  <div className="flex items-center justify-center gap-3">
                    <code className="text-3xl font-bold tracking-widest text-emerald-400">{data.code}</code>
                    <button
                      onClick={copyCode}
                      className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                      style={{ color: copied ? '#10b981' : 'var(--text-muted)', borderColor: copied ? 'rgba(16,185,129,0.3)' : 'var(--border)' }}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Referral code will be generated once the system is set up
                  </p>
                )}
                <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                  You earn <span className="text-emerald-400 font-bold">{'\u20A6'}20</span> for each friend who joins.
                  They get <span className="text-cyan-400 font-bold">{'\u20A6'}10</span> too!
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-3xl font-bold text-emerald-400">{data.totalReferred}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Friends Referred</p>
                </div>
                <div className="p-5 rounded-xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-3xl font-bold text-emerald-400">{'\u20A6'}{data.totalEarned}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Total Earned</p>
                </div>
              </div>

              {/* Apply referral code */}
              <div className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Have a referral code?</h3>
                <div className="flex gap-2">
                  <input
                    value={applyCode}
                    onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g. BW-ABC123)"
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-mono"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                  <button
                    onClick={handleApply}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {applyMsg && (
                  <p className="text-xs mt-2 text-emerald-400">{applyMsg}</p>
                )}
                {applyError && (
                  <p className="text-xs mt-2 text-red-400">{applyError}</p>
                )}
              </div>

              {/* How it works */}
              <div className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>How It Works</h3>
                <div className="space-y-3">
                  {[
                    { step: '1', text: 'Share your referral code with friends' },
                    { step: '2', text: 'They sign up and enter your code on this page' },
                    { step: '3', text: 'You both earn rewards added to your balance' },
                    { step: '4', text: 'Cash out at \u20A6100 for free airtime via Inlomax' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {s.step}
                      </span>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral history */}
              {data.referrals.length > 0 && (
                <div className="p-6 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                    Recent Referrals
                  </h3>
                  <div className="space-y-2">
                    {data.referrals.map((r) => (
                      <div key={r.id} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {r.referred_email || 'Anonymous user'}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.status === 'flagged' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">Flagged</span>
                          )}
                          {r.status === 'revoked' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Revoked</span>
                          )}
                          <span className={`text-sm font-mono ${r.status === 'revoked' ? 'text-red-400 line-through' : 'text-emerald-400'}`}>
                            +{'\u20A6'}{r.reward_amount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

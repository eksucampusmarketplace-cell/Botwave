'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface UserPlan {
  id: string;
  username: string;
  plan: string;
  sessions_limit: number;
  commands_limit: number;
  created_at: string;
  last_login_at: string | null;
  totalSessions: number;
}

interface PricingTier {
  name: string;
  price: number;
  sessions: number;
  commands: number;
  features: string[];
}

const DEFAULT_TIERS: PricingTier[] = [
  { name: 'free', price: 0, sessions: 2, commands: 100, features: ['Basic commands', '2 bot sessions', '100 commands/day'] },
  { name: 'starter', price: 5, sessions: 5, commands: 500, features: ['All free features', '5 bot sessions', '500 commands/day', 'Auto-replies'] },
  { name: 'pro', price: 15, sessions: 15, commands: 2000, features: ['All starter features', '15 bot sessions', '2000 commands/day', 'Priority support', 'Custom responses'] },
  { name: 'enterprise', price: 50, sessions: 100, commands: -1, features: ['Unlimited everything', '100 bot sessions', 'Unlimited commands', 'Dedicated support', 'API access'] },
];

export default function SubscriptionsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserPlan[]>([]);
  const [tiers, setTiers] = useState<PricingTier[]>(DEFAULT_TIERS);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filterPlan, setFilterPlan] = useState('all');
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/monetization');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.success) {
        setUsers(data.data?.users || data.users || []);
        if (data.data?.tiers) setTiers(data.data.tiers);
      }
    } catch (err) {
      console.error('Error fetching monetization data:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpgrade = async (userId: string, plan: string) => {
    try {
      const res = await fetch('/api/admin/monetization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `User upgraded to ${plan}` });
        setShowUpgradeModal(null);
        fetchData();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update plan' });
    }
  };

  const planCounts = {
    free: users.filter(u => !u.plan || u.plan === 'free').length,
    starter: users.filter(u => u.plan === 'starter').length,
    pro: users.filter(u => u.plan === 'pro').length,
    enterprise: users.filter(u => u.plan === 'enterprise').length,
  };

  const totalRevenue = users.reduce((sum, u) => {
    const tier = tiers.find(t => t.name === u.plan);
    return sum + (tier?.price || 0);
  }, 0);

  const filtered = filterPlan === 'all'
    ? users
    : users.filter(u => (u.plan || 'free') === filterPlan);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pricing & Subscriptions</h1>
        <p className="text-gray-500 text-sm mt-1">Manage user plans and pricing tiers</p>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </motion.div>
      )}

      {/* Revenue overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs">MONTHLY REVENUE</p>
          <p className="text-2xl font-bold text-green-400">${totalRevenue}</p>
        </div>
        {Object.entries(planCounts).map(([plan, count]) => (
          <div key={plan} className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase">{plan}</p>
            <p className="text-2xl font-bold text-white">{count}</p>
          </div>
        ))}
      </div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {tiers.map(tier => (
          <div key={tier.name} className="bg-white/5 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold capitalize">{tier.name}</h3>
              <span className="text-green-400 font-bold">{tier.price === 0 ? 'Free' : `$${tier.price}/mo`}</span>
            </div>
            <ul className="space-y-1">
              {tier.features.map(f => (
                <li key={f} className="text-gray-400 text-xs flex items-center gap-1.5">
                  <span className="text-green-400">+</span>{f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-white font-semibold">User Plans</h2>
          <div className="flex gap-1">
            {['all', 'free', 'starter', 'pro', 'enterprise'].map(plan => (
              <button
                key={plan}
                onClick={() => setFilterPlan(plan)}
                className={`px-3 py-1 rounded text-xs ${filterPlan === plan ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400'}`}
              >
                {plan.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">USER</th>
                <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">PLAN</th>
                <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">SESSIONS</th>
                <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">JOINED</th>
                <th className="text-right text-gray-400 text-xs font-mono px-4 py-3">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white">{user.username || user.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.plan === 'pro' ? 'bg-purple-500/20 text-purple-400'
                      : user.plan === 'enterprise' ? 'bg-yellow-500/20 text-yellow-400'
                      : user.plan === 'starter' ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.plan || 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{user.totalSessions || 0}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setShowUpgradeModal(user.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Change Plan
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-4">Change User Plan</h3>
            <div className="space-y-2">
              {tiers.map(tier => (
                <button
                  key={tier.name}
                  onClick={() => handleUpgrade(showUpgradeModal, tier.name)}
                  className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <span className="text-white font-medium capitalize">{tier.name}</span>
                  <span className="text-gray-400 text-sm ml-2">
                    {tier.price === 0 ? 'Free' : `$${tier.price}/mo`}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowUpgradeModal(null)} className="w-full mt-3 py-2 bg-white/10 text-gray-300 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

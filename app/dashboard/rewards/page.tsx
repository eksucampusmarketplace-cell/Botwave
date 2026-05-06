'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface RewardBalance {
  balance: number;
  total_earned: number;
  total_cashed_out: number;
}

interface SubscriptionData {
  plan: string;
  plan_name: string;
  plan_price: number;
  status: string;
  quota_limit: number;
  quota_used: number;
  session_limit: number;
  ai_daily_limit: number;
  next_renewal: string | null;
}

const EARNING_GUIDE = [
  { action: 'Connect first session', reward: '₦10', note: 'One-time' },
  { action: 'Use a command', reward: '₦1', note: 'Max 10/day' },
  { action: 'Daily active (5+ msgs)', reward: '₦3', note: 'Once/day' },
  { action: 'Refer a friend', reward: '₦15', note: 'No limit' },
  { action: 'Upgrade plan', reward: '₦30', note: 'Once per tier' },
  { action: '7-day streak', reward: '₦10', note: 'Weekly' },
];

export default function RewardsPage() {
  const [rewards, setRewards] = useState<RewardBalance | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/subscription')
      .then((r) => r.json())
      .then((data) => {
        if (data.rewards) setRewards(data.rewards);
        if (data.subscription) setSubscription(data.subscription);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const progress = rewards ? Math.min(100, Math.round((rewards.balance / 100) * 100)) : 0;

  return (
    <main className="min-h-screen bg-dark px-4 py-12 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/dashboard" className="font-mono text-xs text-green/50 tracking-[2px] hover:text-green transition-colors">
            {'<'} BACK TO DASHBOARD
          </Link>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[4px] mt-6 mb-4">
            REWARDS & <span className="text-green">PLAN</span>
          </h1>
        </div>

        {loading ? (
          <div className="text-center font-mono text-sm text-[#5a9a7a]">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-green/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green/30" />
              <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green/30" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green/30" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green/30" />

              <h2 className="font-display text-sm font-bold text-white tracking-[3px] mb-4">
                CURRENT PLAN
              </h2>

              {subscription && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-mono text-xs text-[#5a9a7a]">Plan</span>
                    <span className="font-mono text-sm text-green font-bold">{subscription.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-xs text-[#5a9a7a]">Status</span>
                    <span className={`font-mono text-xs ${subscription.status === 'active' ? 'text-green' : 'text-red-400'}`}>
                      {subscription.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-xs text-[#5a9a7a]">Messages</span>
                    <span className="font-mono text-xs text-white">
                      {subscription.quota_limit === -1 ? 'Unlimited' : `${subscription.quota_used}/${subscription.quota_limit}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-xs text-[#5a9a7a]">Sessions</span>
                    <span className="font-mono text-xs text-white">{subscription.session_limit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-xs text-[#5a9a7a]">AI Queries</span>
                    <span className="font-mono text-xs text-white">
                      {subscription.ai_daily_limit === -1 ? 'Unlimited' : `${subscription.ai_daily_limit}/day`}
                    </span>
                  </div>
                  {subscription.next_renewal && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#5a9a7a]">Renews</span>
                      <span className="font-mono text-xs text-white">
                        {new Date(subscription.next_renewal).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Link
                href="/dashboard/pricing"
                className="block mt-6 text-center py-2 bg-green text-dark font-mono text-xs font-bold tracking-[2px] hover:bg-green/90 transition-colors"
              >
                {subscription?.plan === 'free' ? 'UPGRADE PLAN' : 'CHANGE PLAN'}
              </Link>
            </motion.div>

            {/* Reward Balance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-green/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan/30" />
              <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan/30" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan/30" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan/30" />

              <h2 className="font-display text-sm font-bold text-white tracking-[3px] mb-4">
                REWARD BALANCE
              </h2>

              {rewards && (
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="font-display text-4xl font-black text-cyan">
                      ₦{rewards.balance}
                    </span>
                    <p className="font-mono text-xs text-[#5a9a7a] mt-1">current balance</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-[#5a9a7a]">Progress to ₦100 cashout</span>
                      <span className="text-cyan">{progress}%</span>
                    </div>
                    <div className="h-3 bg-dark border border-cyan/20 overflow-hidden">
                      <div
                        className="h-full bg-cyan/60 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="text-center">
                      <span className="font-mono text-lg text-green font-bold">₦{rewards.total_earned}</span>
                      <p className="font-mono text-[10px] text-[#5a9a7a]">TOTAL EARNED</p>
                    </div>
                    <div className="text-center">
                      <span className="font-mono text-lg text-green font-bold">₦{rewards.total_cashed_out}</span>
                      <p className="font-mono text-[10px] text-[#5a9a7a]">CASHED OUT</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* How to Earn */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 bg-card border border-green/10 p-6 relative"
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green/30" />
              <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green/30" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green/30" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green/30" />

              <h2 className="font-display text-sm font-bold text-white tracking-[3px] mb-6">
                HOW TO EARN
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {EARNING_GUIDE.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-dark/50 border border-green/5">
                    <span className="font-display text-xl font-black text-green">{item.reward}</span>
                    <div>
                      <p className="font-mono text-xs text-white">{item.action}</p>
                      <p className="font-mono text-[10px] text-[#5a9a7a]">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="font-mono text-xs text-[#5a9a7a] mt-6 text-center">
                When your balance reaches ₦100, free airtime is automatically sent to your WhatsApp number!
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}

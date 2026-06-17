'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface PlanInfo {
  name: string;
  price: number;
  quotaLimit: number;
  sessionLimit: number;
  aiDailyLimit: number;
  features: string[];
}

interface PaymentRecord {
  id: string;
  plan: string;
  amount: number;
  status: string;
  // Legacy DB column name; stores provider transaction reference.
  squad_transaction_ref: string;
  created_at: string;
}

const PLANS: Record<string, PlanInfo> = {
  free: {
    name: 'Free',
    price: 0,
    quotaLimit: 300,
    sessionLimit: 1,
    aiDailyLimit: 10,
    features: [
      'Basic commands',
      '300 messages/month',
      '1 session',
      '10 AI queries/day',
      'Message templates (3)',
      'Rate limit dashboard',
    ],
  },
  lite: {
    name: 'Lite',
    price: 500,
    quotaLimit: 2000,
    sessionLimit: 1,
    aiDailyLimit: 50,
    features: [
      'All commands',
      '2,000 messages/month',
      '1 session',
      '50 AI queries/day',
      'Auto reply',
      'Message templates (10)',
      'Custom commands (5)',
      'Rate limit dashboard',
      'QR expiry alerts (email)',
    ],
  },
  standard: {
    name: 'Standard',
    price: 1000,
    quotaLimit: 10000,
    sessionLimit: 3,
    aiDailyLimit: 200,
    features: [
      'All commands',
      '10,000 messages/month',
      '3 sessions',
      '200 AI queries/day',
      'Auto reply',
      'Status viewer',
      'Priority support',
      'Message templates (50)',
      'Custom commands (20)',
      'Group analytics',
      'Chatbot flow builder (3 flows)',
      'Rate limit dashboard',
      'QR expiry alerts (email + WhatsApp)',
    ],
  },
  boss: {
    name: 'Boss',
    price: 2000,
    quotaLimit: -1,
    sessionLimit: 5,
    aiDailyLimit: -1,
    features: [
      'Everything unlimited',
      'Unlimited messages',
      '5 sessions',
      'Unlimited AI queries',
      'API access',
      'Custom branding',
      'Priority support',
      'Unlimited templates',
      'Unlimited custom commands',
      'Group analytics + export',
      'Chatbot flow builder (unlimited)',
      'E-commerce integration',
      'Rate limit dashboard',
      'QR expiry alerts (all channels)',
    ],
  },
};

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch('/api/user/subscription', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.subscription?.plan) {
          setCurrentPlan(data.subscription.plan);
        }
      })
      .catch(() => {});
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const res = await fetch('/api/payments/history', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch {
      // payments table may not exist yet
    }
  };

  const handleUpgrade = async (planKey: string) => {
    if (planKey === 'free' || planKey === currentPlan) return;
    setLoading(planKey);
    setMessage(null);

    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 12000);
    console.log(`[PAYMENT] Initiating upgrade to plan=${planKey}`);

    try {
      const startMs = performance.now();
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: planKey }),
        signal: controller.signal,
      });
      clearTimeout(fetchTimeout);

      console.log(`[PAYMENT] /api/payments/initiate responded: HTTP ${res.status} in ${Math.round(performance.now() - startMs)}ms`);

      if (res.status === 401) {
        setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
        setLoading(null);
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        console.error('[PAYMENT] API returned failure:', data.error);
        setMessage({ type: 'error', text: data.error || 'Payment initialization failed' });
        setLoading(null);
        return;
      }

      if (!data.checkoutUrl) {
        console.error('[PAYMENT] Missing checkout URL in initiate response');
        setMessage({ type: 'error', text: 'Payment gateway is unavailable right now. Please try again shortly.' });
        setLoading(null);
        return;
      }

      setMessage({ type: 'success', text: 'Redirecting to secure Flutterwave checkout...' });
      window.location.href = data.checkoutUrl;
    } catch (err) {
      clearTimeout(fetchTimeout);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const errDetail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);

      console.error(`[PAYMENT] CATCH: ${isTimeout ? 'TIMEOUT (12s)' : errDetail}`, err);
      setMessage({
        type: 'error',
        text: isTimeout
          ? 'Payment request timed out. Please check your internet connection and try again.'
          : `Something went wrong: ${errDetail}`,
      });
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-dark relative">
      <DashboardNav />
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[4px] mt-6 mb-4">
            CHOOSE YOUR <span className="text-blue-600 dark:text-blue-400">PLAN</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] tracking-[2px]">
            {'// UNLOCK MORE POWER FOR YOUR BOT'}
          </p>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-md mx-auto mb-8 p-4 border font-mono text-sm text-center ${
              message.type === 'success'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                : 'bg-red-500/10 border-red-400/30 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(PLANS).map(([key, plan], index) => {
            const isCurrent = currentPlan === key;
            const isPopular = key === 'standard';

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative bg-card border p-6 flex flex-col ${
                  isPopular
                    ? 'border-blue-500/40 shadow-[0_0_30px_rgba(0,255,136,0.1)]'
                    : 'border-blue-500/10'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-dark font-mono text-[10px] font-bold tracking-[2px] px-3 py-1">
                    POPULAR
                  </div>
                )}

                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-blue-500/30" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-blue-500/30" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-blue-500/30" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-blue-500/30" />

                <h3 className="font-display text-lg font-bold text-white tracking-[3px] mb-2">
                  {plan.name.toUpperCase()}
                </h3>

                <div className="mb-6">
                  <span className="font-display text-3xl font-black text-blue-600 dark:text-blue-400">
                    {plan.price === 0 ? 'FREE' : `₦${plan.price.toLocaleString()}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="font-mono text-xs text-[#5a9a7a] ml-1">/mo</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="font-mono text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5">{'>'}</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={isCurrent || key === 'free' || loading !== null}
                  className={`w-full py-3 font-mono text-xs tracking-[2px] transition-all ${
                    isCurrent
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 cursor-default'
                      : key === 'free'
                        ? 'bg-dark border border-blue-500/10 text-[#5a9a7a] cursor-default'
                        : 'bg-blue-500 text-dark font-bold hover:bg-blue-500/90 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] active:scale-[0.98]'
                  } ${loading === key ? 'opacity-50' : ''}`}
                >
                  {isCurrent
                    ? 'CURRENT PLAN'
                    : key === 'free'
                      ? 'FREE TIER'
                      : loading === key
                        ? 'PROCESSING...'
                        : 'UPGRADE'}
                </button>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 max-w-2xl mx-auto">
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) fetchPaymentHistory();
            }}
            className="w-full text-center font-mono text-xs text-[#5a9a7a] tracking-[1px] hover:text-blue-600 dark:text-blue-400 transition-colors py-2"
          >
            {showHistory ? '▲ HIDE PAYMENT HISTORY' : '▼ VIEW PAYMENT HISTORY'}
          </button>

          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 space-y-2"
            >
              {payments.length === 0 ? (
                <p className="font-mono text-xs text-[#5a9a7a] text-center py-4">No payment history yet</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-3 border border-blue-500/10 bg-card font-mono text-xs">
                    <div>
                      <span className="text-white capitalize">{p.plan}</span>
                      <span className="text-[#5a9a7a] ml-2">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-blue-600 dark:text-blue-400">₦{p.amount?.toLocaleString()}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          p.status === 'success'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : p.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="font-mono text-xs text-[#5a9a7a] tracking-[1px]">
            All payments are processed securely via Flutterwave.
          </p>
          <p className="font-mono text-xs text-[#5a9a7a] tracking-[1px] mt-2">
            Plans renew monthly. Cancel anytime from the dashboard.
          </p>
        </div>
      </div>
    </main>
  );
}

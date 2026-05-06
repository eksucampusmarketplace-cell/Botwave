'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

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

declare global {
  interface Window {
    squad?: new (config: Record<string, unknown>) => { setup: () => void };
  }
}

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [squadReady, setSquadReady] = useState(false);

  useEffect(() => {
    fetch('/api/user/subscription', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.subscription?.plan) {
          setCurrentPlan(data.subscription.plan);
        }
      })
      .catch(() => {});

    // Load Squad inline script
    const script = document.createElement('script');
    script.src = 'https://checkout.squadco.com/widget/squad.min.js';
    script.async = true;
    script.onload = () => setSquadReady(true);
    script.onerror = () => {
      console.warn('[PAYMENT] Squad widget failed to load, will use checkout URL redirect');
      setSquadReady(false);
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
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

    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: planKey }),
      });

      if (res.status === 401) {
        setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
        setLoading(null);
        setTimeout(() => { window.location.href = '/login'; }, 1500);
        return;
      }

      const data = await res.json();

      if (!data.success) {
        setMessage({ type: 'error', text: data.error || 'Payment initialization failed' });
        setLoading(null);
        return;
      }

      console.log('[PAYMENT] Response:', JSON.stringify({ checkoutUrl: data.checkoutUrl, publicKey: !!data.publicKey, squadReady }));

      // Strategy 1: Try Squad inline modal (with timeout safety)
      if (squadReady && window.squad && data.publicKey) {
        try {
          let callbackFired = false;
          const safetyTimeout = setTimeout(() => {
            if (!callbackFired) {
              console.warn('[PAYMENT] Squad widget timed out — no callback fired in 15s');
              setLoading(null);
              if (data.checkoutUrl) {
                setMessage({ type: 'success', text: 'Opening payment page...' });
                window.open(data.checkoutUrl, '_blank') || (window.location.href = data.checkoutUrl);
              } else {
                setMessage({ type: 'error', text: 'Payment widget timed out. Please try again.' });
              }
            }
          }, 15000);

          const squadInstance = new window.squad({
            onClose: () => {
              callbackFired = true;
              clearTimeout(safetyTimeout);
              setLoading(null);
            },
            onLoad: () => {
              console.log('[PAYMENT] Squad widget loaded');
            },
            onSuccess: () => {
              callbackFired = true;
              clearTimeout(safetyTimeout);
              setMessage({ type: 'success', text: 'Payment successful! Your plan will be activated shortly.' });
              setCurrentPlan(planKey);
              setLoading(null);
            },
            key: data.publicKey,
            email: data.email,
            amount: data.amount * 100,
            currency_code: 'NGN',
            transaction_ref: data.transactionRef,
            payment_channels: ['bank', 'transfer'],
            customer_name: '',
            metadata: { plan: planKey },
          });
          squadInstance.setup();
          return;
        } catch (err) {
          console.warn('[PAYMENT] Squad widget error, trying checkout URL:', err);
        }
      }

      // Strategy 2: Redirect to Squad checkout URL
      if (data.checkoutUrl) {
        setMessage({ type: 'success', text: 'Opening payment page...' });
        // Try window.open first, then window.location as fallback
        const popup = window.open(data.checkoutUrl, '_blank');
        if (!popup || popup.closed) {
          // Popup was blocked, redirect in same tab
          window.location.href = data.checkoutUrl;
        }
        setLoading(null);
        return;
      }

      // Strategy 3: Build Squad checkout URL manually from transaction ref
      if (data.transactionRef) {
        const manualUrl = `https://checkout.squadco.com/${data.transactionRef}`;
        setMessage({ type: 'success', text: 'Opening payment page...' });
        const popup = window.open(manualUrl, '_blank');
        if (!popup || popup.closed) {
          window.location.href = manualUrl;
        }
        setLoading(null);
        return;
      }

      // Nothing worked
      setMessage({ type: 'error', text: 'Payment gateway is not responding. Please try again or contact support.' });
      setLoading(null);
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-dark px-4 py-12 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/dashboard" className="font-mono text-xs text-green/50 tracking-[2px] hover:text-green transition-colors">
            {'<'} BACK TO DASHBOARD
          </Link>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[4px] mt-6 mb-4">
            CHOOSE YOUR <span className="text-green">PLAN</span>
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
                ? 'bg-green/10 border-green/30 text-green'
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
                    ? 'border-green/40 shadow-[0_0_30px_rgba(0,255,136,0.1)]'
                    : 'border-green/10'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green text-dark font-mono text-[10px] font-bold tracking-[2px] px-3 py-1">
                    POPULAR
                  </div>
                )}

                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green/30" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green/30" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green/30" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green/30" />

                <h3 className="font-display text-lg font-bold text-white tracking-[3px] mb-2">
                  {plan.name.toUpperCase()}
                </h3>

                <div className="mb-6">
                  <span className="font-display text-3xl font-black text-green">
                    {plan.price === 0 ? 'FREE' : `₦${plan.price.toLocaleString()}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="font-mono text-xs text-[#5a9a7a] ml-1">/month</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="font-mono text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-green mt-0.5">{'>'}</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={isCurrent || key === 'free' || loading !== null}
                  className={`w-full py-3 font-mono text-xs tracking-[2px] transition-all ${
                    isCurrent
                      ? 'bg-green/20 text-green border border-green/30 cursor-default'
                      : key === 'free'
                        ? 'bg-dark border border-green/10 text-[#5a9a7a] cursor-default'
                        : 'bg-green text-dark font-bold hover:bg-green/90 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] active:scale-[0.98]'
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

        {/* Payment history */}
        <div className="mt-12 max-w-2xl mx-auto">
          <button
            onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchPaymentHistory(); }}
            className="w-full text-center font-mono text-xs text-[#5a9a7a] tracking-[1px] hover:text-green transition-colors py-2"
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
                  <div key={p.id} className="flex justify-between items-center p-3 border border-green/10 bg-card font-mono text-xs">
                    <div>
                      <span className="text-white capitalize">{p.plan}</span>
                      <span className="text-[#5a9a7a] ml-2">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green">₦{p.amount?.toLocaleString()}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        p.status === 'completed' ? 'bg-green/10 text-green' :
                        p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
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
            All payments are processed securely via Squad. Bank transfer supported.
          </p>
          <p className="font-mono text-xs text-[#5a9a7a] tracking-[1px] mt-2">
            Plans renew monthly. Cancel anytime from the dashboard.
          </p>
        </div>
      </div>
    </main>
  );
}

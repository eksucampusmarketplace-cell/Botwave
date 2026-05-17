'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const terminalLines = [
  { cls: 'comment', text: '# BotWave — New Account Setup' },
  { cls: 'cmd', text: '$ botwave create-account' },
  { cls: 'output', text: '→ Setting up your workspace...' },
  { cls: 'blank', text: '' },
  { cls: 'comment', text: '# What you get:' },
  { cls: 'flag', text: '  → WhatsApp, Telegram Bot & Userbot' },
  { cls: 'flag', text: '  → 50+ automation commands' },
  { cls: 'flag', text: '  → AI chatbot (BYOK)' },
  { cls: 'flag', text: '  → Sticker maker & media tools' },
  { cls: 'flag', text: '  → Anti-ban protection system' },
  { cls: 'flag', text: '  → Group management toolkit' },
  { cls: 'flag', text: '  → Mini games & engagement' },
  { cls: 'blank', text: '' },
  { cls: 'success', text: '→ 3 platforms. Free forever. No credit card.' },
  { cls: 'success', text: '→ Fill in your details to begin →' },
];

function SignupTerminal() {
  const [lines, setLines] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setLines((p) => (p >= terminalLines.length ? p : p + 1));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="terminal h-full">
      <div className="terminal-header">
        <div className="terminal-dot" style={{ background: '#ff5f57' }} />
        <div className="terminal-dot" style={{ background: '#febc2e' }} />
        <div className="terminal-dot" style={{ background: '#28c840' }} />
        <span className="text-xs text-slate-500 ml-3 font-mono">setup — botwave</span>
      </div>
      <div className="terminal-body">
        {terminalLines.slice(0, lines).map((l, i) => (
          <div key={i} className={l.cls === 'blank' ? 'h-3' : ''}>
            <span className={l.cls}>{l.text}</span>
          </div>
        ))}
        {lines < terminalLines.length && <span className="cmd">█</span>}
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    referralCode: '',
  });
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setFormData((prev) => ({ ...prev, referralCode: ref.toUpperCase() }));
  }, [searchParams]);

  const getSignupSource = () => {
    const ref = searchParams.get('ref');
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');
    const via = searchParams.get('via');

    let source = 'direct';
    if (ref || formData.referralCode) source = 'referral';
    else if (via === 'whatsapp' || utmSource === 'whatsapp') source = 'whatsapp';
    else if (utmSource === 'google' || utmMedium === 'cpc') source = 'google';
    else if (utmSource) source = utmSource;
    else if (document.referrer) {
      try {
        const refHost = new URL(document.referrer).hostname;
        if (refHost.includes('chatgpt') || refHost.includes('openai')) source = 'chatgpt';
        else if (refHost.includes('google')) source = 'google_organic';
        else if (refHost.includes('whatsapp')) source = 'whatsapp';
        else if (refHost.includes('facebook') || refHost.includes('fb.')) source = 'facebook';
        else if (refHost.includes('twitter') || refHost.includes('x.com')) source = 'twitter';
        else if (refHost.includes('instagram')) source = 'instagram';
        else source = refHost;
      } catch { /* ignore */ }
    }

    return {
      signup_source: source,
      signup_referrer: document.referrer || undefined,
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
      utm_campaign: utmCampaign || undefined,
    };
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          referralCode: formData.referralCode || undefined,
          ...getSignupSource(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      if (data.requiresVerification) {
        setStep('verify');
        setResendCooldown(60);
      } else {
        router.push('/login?message=Account created successfully. You can now login.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && newCode.every((d) => d !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setVerificationCode(newCode);
      handleVerify(pasted);
    }
  };

  const handleVerify = async (codeStr?: string) => {
    const code = codeStr || verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      router.push('/login?message=Account created successfully. You can now login.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setVerificationCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    }
  };

  const inputClass = "w-full bg-[#0d1117] border border-[#1e293b] px-4 py-3 rounded-lg text-slate-200 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-600 font-mono";

  return (
    <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 tech-grid opacity-30" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left — Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <Link href="/" className="text-3xl font-bold text-white">
              Bot<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Wave</span>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSubmit}
                className="glass-card rounded-xl p-8"
              >
                <h2 className="text-2xl font-bold text-white mb-1">
                  Create Account
                </h2>
                <p className="text-sm text-slate-500 font-mono mb-8">
                  // automate whatsapp & telegram for free
                </p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-6"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">USERNAME</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="choose_a_username"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">EMAIL</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">PASSWORD</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="min. 8 characters"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">CONFIRM PASSWORD</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5 font-mono">REFERRAL CODE <span className="text-slate-600">(optional)</span></label>
                    <input
                      type="text"
                      name="referralCode"
                      value={formData.referralCode}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="BW-XXXXXX"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending Code...
                      </span>
                    ) : (
                      'Create Account →'
                    )}
                  </button>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                      Sign in
                    </Link>
                  </p>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="verify-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card rounded-xl p-8"
              >
                <h2 className="text-2xl font-bold text-white mb-1">
                  Verify Your Email
                </h2>
                <p className="text-sm text-slate-500 font-mono mb-2">
                  // check your inbox for the code
                </p>
                <p className="text-sm text-slate-400 mb-3">
                  We sent a 6-digit code to <span className="text-emerald-400 font-medium">{formData.email}</span>
                </p>
                <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-8">
                  Don&apos;t see it? Check your <span className="font-semibold">spam/junk folder</span> — emails from new senders sometimes land there.
                </p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-6"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex justify-center gap-3 mb-8" onPaste={handleCodePaste}>
                  {verificationCode.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 bg-[#0d1117] border border-[#1e293b] rounded-lg text-center text-xl font-bold text-white font-mono focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <button
                  onClick={() => handleVerify()}
                  disabled={loading || verificationCode.some((d) => !d)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10 mb-4"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Create Account'
                  )}
                </button>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setStep('form'); setError(''); setVerificationCode(['', '', '', '', '', '']); }}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="text-sm text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 transition-colors"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right — Terminal */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden lg:block"
        >
          <SignupTerminal />
        </motion.div>
      </div>
    </main>
  );
}

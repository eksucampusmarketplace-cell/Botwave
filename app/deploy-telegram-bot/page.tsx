'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface StepProps {
  active: boolean;
  completed: boolean;
  number: number;
  title: string;
}

function StepIndicator({ active, completed, number, title }: StepProps) {
  return (
    <div className={`flex items-center gap-3 ${active ? 'opacity-100' : 'opacity-50'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
        completed ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
      }`}>
        {completed ? '✓' : number}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-500'}`}>{title}</span>
    </div>
  );
}

export default function DeployTelegramBotPage() {
  const [step, setStep] = useState(1);
  const [token, setToken] = useState('');
  const [botInfo, setBotInfo] = useState<{ username: string; firstName: string } | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [validating, setValidating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [enableAntiFlood, setEnableAntiFlood] = useState(true);
  const [enableAntiLink, setEnableAntiLink] = useState(false);
  const [enableCaptcha, setEnableCaptcha] = useState(true);
  const [enableAntiRaid, setEnableAntiRaid] = useState(true);
  const [welcomeText, setWelcomeText] = useState('Welcome {name} to {group}! Please read the /rules.');

  const validateToken = async () => {
    if (!token.trim()) { setError('Please enter a bot token'); return; }
    setValidating(true);
    setError('');
    try {
      const res = await fetch('/api/telegram/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setBotInfo({ username: data.data.username, firstName: data.data.firstName });
        setSessionName(data.data.username);
        setStep(2);
      } else {
        setError(data.error || 'Invalid token');
      }
    } catch {
      setError('Failed to validate token');
    } finally {
      setValidating(false);
    }
  };

  const deploy = async () => {
    setDeploying(true);
    setError('');
    try {
      const res = await fetch('/api/bot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: sessionName || botInfo?.username,
          platform: 'telegram_bot',
          telegramBotToken: token.trim(),
          telegramBotUsername: botInfo?.username,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Apply config settings
        await fetch('/api/telegram/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: data.data.id,
            antiflood_enabled: enableAntiFlood,
            antilink_enabled: enableAntiLink,
            captcha_enabled: enableCaptcha,
            antiraid_enabled: enableAntiRaid,
            welcome_text: welcomeText,
          }),
        });
        setSuccess(true);
        setStep(4);
      } else {
        setError(data.error || 'Deployment failed');
      }
    } catch {
      setError('Failed to deploy bot');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="pt-24 px-4 md:px-8 max-w-3xl mx-auto pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
            Deploy <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Telegram Bot</span>
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Set up your Telegram bot in a few easy steps
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex flex-col gap-3 mb-10">
          <StepIndicator active={step >= 1} completed={step > 1} number={1} title="Enter Bot Token" />
          <StepIndicator active={step >= 2} completed={step > 2} number={2} title="Configure Settings" />
          <StepIndicator active={step >= 3} completed={step > 3} number={3} title="Review & Deploy" />
          <StepIndicator active={step >= 4} completed={success} number={4} title="Done!" />
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Bot Token */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Step 1: Bot Token</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Get your bot token from <a href="https://t.me/BotFather" target="_blank" rel="noopener" className="text-blue-400 hover:underline">@BotFather</a> on Telegram.
              </p>
              <ol className="list-decimal list-inside text-sm mb-6 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>Open Telegram and search for @BotFather</li>
                <li>Send /newbot and follow the prompts</li>
                <li>Copy the token BotFather gives you</li>
                <li>Paste it below</li>
              </ol>
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="123456789:ABCDefGhIjKlMnOpQrStUvWxYz"
                className="w-full p-3 rounded-xl mb-4 text-sm font-mono"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
              <button onClick={validateToken} disabled={validating}
                className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {validating ? 'Validating...' : 'Validate Token'}
              </button>
            </motion.div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-lg">🤖</div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>@{botInfo?.username}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{botInfo?.firstName}</p>
                </div>
              </div>

              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Session Name</h3>
              <input type="text" value={sessionName} onChange={e => setSessionName(e.target.value)}
                className="w-full p-3 rounded-xl mb-5 text-sm"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />

              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Protection Features</h3>
              <div className="space-y-3 mb-5">
                {[
                  { label: 'Anti-Flood', desc: 'Rate limit messages', state: enableAntiFlood, set: setEnableAntiFlood },
                  { label: 'Anti-Link', desc: 'Remove unauthorized links', state: enableAntiLink, set: setEnableAntiLink },
                  { label: 'Captcha', desc: 'Verify new members', state: enableCaptcha, set: setEnableCaptcha },
                  { label: 'Anti-Raid', desc: 'Detect mass joins', state: enableAntiRaid, set: setEnableAntiRaid },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.label}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f.desc}</div>
                    </div>
                    <button onClick={() => f.set(!f.state)}
                      className={`w-12 h-7 rounded-full transition-colors ${f.state ? 'bg-blue-600' : 'bg-gray-600'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${f.state ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome Message</h3>
              <textarea value={welcomeText} onChange={e => setWelcomeText(e.target.value)} rows={3}
                className="w-full p-3 rounded-xl mb-5 text-sm resize-none"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 p-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 p-3 rounded-xl bg-blue-600 text-white text-sm font-semibold">
                  Review
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="rounded-2xl p-6" style={{ background: 'var(--card-bg)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Review & Deploy</h2>
              <div className="space-y-3 mb-6">
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Bot</div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>@{botInfo?.username}</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Session Name</div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sessionName}</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Features</div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {[enableAntiFlood && 'Anti-Flood', enableAntiLink && 'Anti-Link', enableCaptcha && 'Captcha', enableAntiRaid && 'Anti-Raid'].filter(Boolean).join(', ') || 'None'}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 p-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Back
                </button>
                <button onClick={deploy} disabled={deploying}
                  className="flex-1 p-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {deploying ? 'Deploying...' : 'Deploy Bot'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-8 text-center" style={{ background: 'var(--card-bg)' }}>
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Bot Deployed!</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                @{botInfo?.username} is now running and ready to manage your groups.
              </p>
              <div className="space-y-3">
                <a href={`https://t.me/${botInfo?.username}`} target="_blank" rel="noopener"
                  className="block p-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Open in Telegram
                </a>
                <a href="/dashboard/sessions"
                  className="block p-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  Go to Sessions
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

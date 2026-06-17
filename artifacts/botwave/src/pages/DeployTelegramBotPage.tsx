import { useState } from 'react';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface Step {
  number: number;
  title: string;
  active: boolean;
  completed: boolean;
}

export default function DeployTelegramBotPage() {
  const [step, setStep] = useState(1);
  const [token, setToken] = useState('');
  const [botInfo, setBotInfo] = useState<{ username: string; firstName: string } | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [enableAntiFlood, setEnableAntiFlood] = useState(true);
  const [enableCaptcha, setEnableCaptcha] = useState(true);
  const [enableAntiRaid, setEnableAntiRaid] = useState(true);
  const [enableWelcome, setEnableWelcome] = useState(true);
  const [success, setSuccess] = useState(false);

  const steps: Step[] = [
    { number: 1, title: 'Paste Token', active: step === 1, completed: step > 1 },
    { number: 2, title: 'Confirm Bot', active: step === 2, completed: step > 2 },
    { number: 3, title: 'Configure', active: step === 3, completed: step > 3 },
    { number: 4, title: 'Deploy', active: step === 4, completed: success },
  ];

  const validateToken = async () => {
    if (!token.trim()) return;
    setValidating(true);
    setError('');
    try {
      const res = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
      const data = await res.json();
      if (data.ok) {
        setBotInfo({ username: data.result.username, firstName: data.result.first_name });
        setSessionName(data.result.first_name);
        setStep(2);
      } else {
        setError('Invalid token. Please check it and try again.');
      }
    } catch {
      setError('Could not verify token. Please check your connection.');
    } finally {
      setValidating(false);
    }
  };

  const handleDeploy = () => {
    setSuccess(true);
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/telegram-bot" className="hover:text-[var(--primary)]">Telegram Bot</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Deploy</span>
          </nav>

          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Deploy Telegram Bot</h1>
          <p className="text-[var(--text-secondary)] mb-8">Connect your Telegram bot to BotWave in under 2 minutes.</p>

          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  s.completed ? 'bg-emerald-500/10 text-emerald-500' :
                  s.active ? 'bg-blue-600 text-white' :
                  'text-[var(--text-muted)]'
                }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    s.completed ? 'bg-emerald-500 text-white' :
                    s.active ? 'bg-white/20' : 'bg-[var(--border)]'
                  }`}>
                    {s.completed ? '✓' : s.number}
                  </span>
                  {s.title}
                </div>
                {i < steps.length - 1 && <span className="text-[var(--border)]">→</span>}
              </div>
            ))}
          </div>

          <div className="p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
            {success ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Bot Deployed!</h2>
                <p className="text-[var(--text-secondary)] mb-6">
                  Your bot <strong className="text-blue-400">@{botInfo?.username}</strong> is now connected to BotWave.
                  Add it to your Telegram group as an admin to start moderating.
                </p>
                <div className="space-y-3">
                  <a
                    href={`https://t.me/${botInfo?.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                  >
                    Open @{botInfo?.username} on Telegram →
                  </a>
                  <Link href="/dashboard" className="block w-full py-3 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] font-semibold rounded-xl text-center hover:border-blue-400 transition-colors">
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            ) : step === 1 ? (
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Step 1: Paste Your Bot Token</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-2">
                  Don't have a bot yet? Message <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@BotFather</a> on Telegram, type <code className="text-blue-400">/newbot</code>, and follow the instructions.
                </p>
                <p className="text-sm text-[var(--text-secondary)] mb-5">
                  Then paste your bot token below (looks like: <code className="text-blue-400">1234567890:ABCdef...</code>)
                </p>
                {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-500 mb-4">{error}</div>}
                <input
                  type="text"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono text-sm focus:outline-none focus:border-blue-500 mb-4 transition-colors"
                />
                <button
                  onClick={validateToken}
                  disabled={validating || !token.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                >
                  {validating ? 'Validating...' : 'Validate Token →'}
                </button>
              </div>
            ) : step === 2 ? (
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Step 2: Confirm Your Bot</h2>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <p className="text-emerald-500 font-semibold">✓ Bot verified successfully!</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Found: <strong>{botInfo?.firstName}</strong> (@{botInfo?.username})
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Session name (for your dashboard)</label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={e => setSessionName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <button onClick={() => setStep(3)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                  Continue to Configuration →
                </button>
              </div>
            ) : step === 3 ? (
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Step 3: Configure Features</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-5">Enable the features you want. You can change these later from the dashboard.</p>
                <div className="space-y-3 mb-6">
                  {[
                    { label: 'Anti-Flood Protection', desc: 'Auto-remove spam and mass messages', value: enableAntiFlood, set: setEnableAntiFlood },
                    { label: 'Captcha Verification', desc: 'Challenge new members before they can chat', value: enableCaptcha, set: setEnableCaptcha },
                    { label: 'Anti-Raid Shield', desc: 'Detect and block mass-join attacks', value: enableAntiRaid, set: setEnableAntiRaid },
                    { label: 'Welcome Messages', desc: 'Greet new members with a custom message', value: enableWelcome, set: setEnableWelcome },
                  ].map(toggle => (
                    <div key={toggle.label} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{toggle.label}</span>
                        <p className="text-xs text-[var(--text-muted)]">{toggle.desc}</p>
                      </div>
                      <button
                        onClick={() => toggle.set(!toggle.value)}
                        className={`w-10 h-5 rounded-full transition-colors ${toggle.value ? 'bg-blue-600' : 'bg-[var(--border)]'}`}
                      >
                        <span className={`block w-4 h-4 rounded-full bg-white mx-auto transition-transform ${toggle.value ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(4)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                  Review & Deploy →
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Step 4: Deploy</h2>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-[var(--text-muted)]">Bot</span>
                    <span className="text-[var(--text-primary)] font-medium">@{botInfo?.username}</span>
                  </div>
                  <div className="flex justify-between text-sm p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-[var(--text-muted)]">Session name</span>
                    <span className="text-[var(--text-primary)] font-medium">{sessionName}</span>
                  </div>
                  <div className="flex justify-between text-sm p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-[var(--text-muted)]">Features enabled</span>
                    <span className="text-emerald-500 font-medium">
                      {[enableAntiFlood, enableCaptcha, enableAntiRaid, enableWelcome].filter(Boolean).length} / 4
                    </span>
                  </div>
                </div>
                <button onClick={handleDeploy} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors">
                  🚀 Deploy Bot
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

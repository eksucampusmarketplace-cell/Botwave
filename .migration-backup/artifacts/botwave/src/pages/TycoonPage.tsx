import { useState } from 'react';
import { Link } from 'wouter';

export default function TycoonPage() {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoined(true);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,200,50,0.05)_0%,transparent_70%)]" />

      <div className="relative z-10 max-w-lg w-full text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-mono tracking-widest mb-6">
          A TELEGRAM MINI APP
        </span>

        <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
          Cosa Nostra<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Tycoon</span>
        </h1>

        <p className="text-lg text-gray-400 mb-3">Run your crew. Raid rivals. Take the city.</p>

        <div className="space-y-2 text-gray-500 mb-8 text-sm">
          <p>Build a hideout, train shooters and bikers, and send your family on raids.</p>
          <p>No download. No store. One tap from any Telegram chat.</p>
        </div>

        {joined ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
            <p className="text-yellow-400 font-semibold text-lg mb-2">You're in the family. 🤝</p>
            <p className="text-gray-400 text-sm">We'll DM you on Telegram when the game is live.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:opacity-90 transition-opacity shrink-0"
            >
              Join the Family
            </button>
          </form>
        )}

        <p className="text-xs text-gray-600 mt-4">Coming soon to Telegram. Built on BotWave infrastructure.</p>

        <Link href="/" className="block mt-8 text-xs text-gray-600 hover:text-gray-400 transition-colors">
          ← Back to BotWave
        </Link>
      </div>
    </main>
  );
}

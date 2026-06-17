import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';

export default function GamePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-lg mx-auto">
          <div className="text-6xl mb-6">🎮</div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-4">BotWave Games</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Head-to-Head challenges, tournaments, and live games are available in WhatsApp and Telegram groups.
            Start a game in your group chat using <code className="text-blue-400">!trivia</code> or <code className="text-blue-400">!hangman</code>.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/commands" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              View Game Commands
            </Link>
            <Link href="/" className="px-6 py-3 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] text-[var(--text-primary)] font-semibold rounded-xl hover:border-blue-400 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

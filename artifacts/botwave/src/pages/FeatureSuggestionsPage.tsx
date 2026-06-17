import { useState } from 'react';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const topRequests = [
  { title: 'Telegram Bot multi-session sync', votes: 234, status: 'in-progress' },
  { title: 'Zapier / Make integration', votes: 189, status: 'planned' },
  { title: 'Group analytics CSV export', votes: 156, status: 'planned' },
  { title: 'Custom bot profile picture', votes: 143, status: 'shipped' },
  { title: 'Google Sheets sync for group members', votes: 121, status: 'planned' },
  { title: 'Telegram Business API support', votes: 98, status: 'researching' },
];

const statusColors: Record<string, string> = {
  shipped: 'bg-emerald-500/10 text-emerald-500',
  'in-progress': 'bg-blue-500/10 text-blue-500',
  planned: 'bg-yellow-500/10 text-yellow-600',
  researching: 'bg-purple-500/10 text-purple-500',
};

const apiBase = typeof window !== 'undefined' ? (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '' : '';

export default function FeatureSuggestionsPage() {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 10) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/api/feature-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: description.trim(), platform: 'web' }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: 'Feature request submitted! Thank you.' });
        setDescription('');
      } else {
        setResult({ success: false, message: data.error || 'Failed to submit' });
      }
    } catch {
      setResult({ success: false, message: 'Connection error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-mono tracking-wide mb-6">
            FEATURE SUGGESTIONS
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">Help Shape BotWave</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            Have an idea for a new feature? Tell us what you need. We review every suggestion.
          </p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="p-8 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] mb-12">
            <h2 className="font-bold text-[var(--text-primary)] mb-4">Submit a Feature Request</h2>
            {result ? (
              <div className={`p-4 rounded-xl mb-4 ${result.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                {result.message}
              </div>
            ) : null}
            <form onSubmit={handleSubmit}>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the feature you'd like to see. Be specific: what problem does it solve, and how would it work?"
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 resize-none mb-3 transition-colors"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">{description.length}/500 characters</span>
                <button
                  type="submit"
                  disabled={submitting || description.trim().length < 10}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>

          <div>
            <h2 className="font-bold text-[var(--text-primary)] mb-5">Top Requested Features</h2>
            <div className="space-y-2">
              {topRequests.map((req, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                  <span className="text-2xl font-black text-[var(--text-muted)] w-6 text-center shrink-0">{req.votes}</span>
                  <div className="flex-1">
                    <span className="text-sm text-[var(--text-primary)]">{req.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[req.status]}`}>
                    {req.status === 'in-progress' ? 'In Progress' : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

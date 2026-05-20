'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function FeatureSuggestionsPage() {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; id?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 10) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/feature-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          platform: 'web',
          userIdentifier: 'website-visitor',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          success: true,
          message: `Feature request submitted! Our AI is analyzing it now. Tracking ID: ${data.id?.slice(0, 8)}`,
          id: data.id,
        });
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

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-mono tracking-wide mb-6">
            FEATURE SUGGESTIONS
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Help Shape BotWave
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-4">
            Have an idea for a new feature? Tell us what you need — our AI analyzes every suggestion
            and the team reviews the best ones for implementation.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            You can also suggest features via <strong>!feature</strong> on WhatsApp or <strong>/feature</strong> on Telegram.
          </p>
        </div>
      </section>

      {/* Submission Form */}
      <section className="pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Describe Your Feature Idea
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-xl p-4 text-sm min-h-[150px] resize-y outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                placeholder="Example: I want a command that lets me schedule WhatsApp messages to be sent at a specific time, like !schedule 2pm Hello everyone — meeting starts now."
                maxLength={2000}
                disabled={submitting}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-[var(--text-muted)]">
                  Be specific — describe the problem you are trying to solve, not just the feature name.
                </p>
                <span className="text-xs text-[var(--text-muted)]">{description.length}/2000</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || description.trim().length < 10}
              className="w-full py-3 px-6 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Feature Suggestion'}
            </button>

            {result && (
              <div className={`p-4 rounded-xl text-sm ${result.success ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {result.message}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-12">
            How Feature Suggestions Work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'You Describe It', desc: 'Tell us what you want — a new command, a UI improvement, a bot behavior change, anything.' },
              { step: '2', title: 'AI Analyzes It', desc: 'Our AI reviews feasibility, estimates effort, and suggests a priority level. No human bottleneck.' },
              { step: '3', title: 'We Build It', desc: 'Top suggestions are added to our roadmap and implemented. You get notified when it ships.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Requests */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-8">
            Popular Feature Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '📅', title: 'Scheduled Messages', desc: 'Time-based message sending, recurring announcements, drip campaigns.' },
              { icon: '🌐', title: 'Multi-Language Support', desc: 'Auto-translate bot responses, multilingual commands, language detection.' },
              { icon: '📊', title: 'Advanced Analytics', desc: 'Message volume charts, user engagement heatmaps, export reports.' },
              { icon: '🔗', title: 'Integrations', desc: 'Shopify, Google Sheets, CRM, payment gateways, webhooks.' },
              { icon: '🤖', title: 'AI Improvements', desc: 'Better context memory, custom personality, image generation, voice notes.' },
              { icon: '🛡️', title: 'Security & Moderation', desc: 'NSFW filter, link scanner, phone number masking, audit logs.' },
            ].map(c => (
              <div key={c.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{c.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Not a BotWave User Yet?
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Sign up free and start automating your WhatsApp and Telegram bots today.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="inline-block px-8 py-3 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3 bg-[var(--bg)] text-[var(--text-primary)] font-bold rounded-lg border border-[var(--border)] hover:bg-[var(--surface-light)] transition-colors"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

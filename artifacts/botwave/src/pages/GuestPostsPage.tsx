import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface GuestPost {
  id: string;
  author_name: string;
  title: string;
  body: string;
  original_lang: string;
  display_lang: string;
  upvotes: number;
  created_at: string;
}

const LANGUAGES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese',
  de: 'German', ar: 'Arabic', zh: 'Chinese', hi: 'Hindi',
  yo: 'Yoruba', ig: 'Igbo', ha: 'Hausa', sw: 'Swahili',
  ru: 'Russian', ja: 'Japanese', ko: 'Korean', tr: 'Turkish',
};

const SAMPLE_POSTS: GuestPost[] = [
  { id: '1', author_name: 'Emeka O.', title: 'BotWave saved my WhatsApp group!', body: 'I was spending 2 hours daily managing my 500-member group. After setting up BotWave, the anti-spam and welcome messages handle everything automatically. Highly recommended!', original_lang: 'en', display_lang: 'en', upvotes: 42, created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '2', author_name: 'Fatima A.', title: 'The sticker maker is incredible', body: 'My students love that they can make custom stickers right inside our WhatsApp group. No need for separate apps. BotWave makes it so easy.', original_lang: 'en', display_lang: 'en', upvotes: 38, created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '3', author_name: 'Kwame B.', title: 'Free and actually works', body: 'I tried three other bot platforms before BotWave. They either cost money or kept getting my account flagged. BotWave is free and the anti-ban system actually works.', original_lang: 'en', display_lang: 'en', upvotes: 57, created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '4', author_name: 'Priya S.', title: 'AI commands in Telegram are game-changing', body: 'The Telegram userbot with AI commands is perfect for our study group. Anyone can ask a question and get an instant AI response. We use it every day.', original_lang: 'en', display_lang: 'en', upvotes: 29, created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
];

export default function GuestPostsPage() {
  const [posts, setPosts] = useState<GuestPost[]>(SAMPLE_POSTS);
  const [lang, setLang] = useState('en');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/guest-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: content, author_name: authorName, original_lang: lang }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult({ success: true, message: 'Post submitted! It will appear after review.' });
        setTitle(''); setContent(''); setAuthorName(''); setShowForm(false);
      } else {
        setSubmitResult({ success: false, message: data.error || 'Submission failed. Try again.' });
      }
    } catch {
      setSubmitResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p));
    try {
      await fetch(`/api/guest-posts/${id}/upvote`, { method: 'POST' });
    } catch {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, upvotes: p.upvotes - 1 } : p));
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2">Guest Posts</h1>
              <p className="text-[var(--text-secondary)]">Stories and tips from the BotWave community.</p>
            </div>
            <button
              onClick={() => setShowForm(v => !v)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors whitespace-nowrap"
            >
              + Share Your Story
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${lang === code ? 'bg-blue-500 text-white border-blue-500' : 'text-[var(--text-muted)] border-[var(--border)] hover:border-blue-400'}`}
              >
                {name}
              </button>
            ))}
          </div>

          {submitResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`p-4 rounded-xl mb-6 text-sm ${submitResult.success ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {submitResult.message}
            </motion.div>
          )}

          <AnimatePresence>
            {showForm && (
              <motion.form
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="mb-8 p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] space-y-4"
              >
                <h2 className="font-bold text-[var(--text-primary)]">Share Your Story</h2>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Your Name (optional)</label>
                  <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Anonymous"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 text-sm transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="How BotWave helped me..." required
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 text-sm transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Your Story</label>
                  <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Tell the community about your experience..." required rows={5}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500 text-sm transition-colors resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                    {submitting ? 'Submitting...' : 'Submit Story'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-6 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] font-medium text-sm transition-colors hover:border-[var(--text-muted)]">
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {posts.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-[var(--text-primary)] mb-1">{post.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">{post.body}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span>by {post.author_name || 'Anonymous'}</span>
                      <span>·</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => handleUpvote(post.id)}
                    className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border border-[var(--border)] hover:border-blue-400 text-[var(--text-muted)] hover:text-blue-500 transition-colors">
                    <span className="text-sm">▲</span>
                    <span className="text-xs font-semibold">{post.upvotes}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

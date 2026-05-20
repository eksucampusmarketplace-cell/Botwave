'use client';

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

export default function GuestPostsPage() {
  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('en');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [postLang, setPostLang] = useState('en');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [translating, setTranslating] = useState(false);

  const fetchPosts = useCallback(async (selectedLang: string) => {
    setTranslating(true);
    try {
      const res = await fetch(`/api/guest-posts?lang=${selectedLang}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setTranslating(false);
    }
  }, []);

  useEffect(() => {
    // Detect browser language
    const browserLang = navigator.language?.split('-')[0] || 'en';
    const detectedLang = LANGUAGES[browserLang] ? browserLang : 'en';
    setLang(detectedLang);
    fetchPosts(detectedLang);
  }, [fetchPosts]);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    fetchPosts(newLang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/guest-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          authorName: authorName.trim() || 'Anonymous',
          lang: postLang,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult({ success: true, message: data.message });
        setTitle('');
        setContent('');
        setAuthorName('');
        setShowForm(false);
        fetchPosts(lang);
      } else {
        setSubmitResult({ success: false, message: data.error || 'Failed to submit' });
      }
    } catch {
      setSubmitResult({ success: false, message: 'Connection error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-mono tracking-wide mb-6">
            COMMUNITY
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-6 leading-tight">
            Guest Posts
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-4">
            Share your bot-building tips, automation stories, or feature ideas with the BotWave community.
            Every post is automatically translated for readers worldwide.
          </p>

          {/* Language Selector */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="text-sm text-[var(--text-muted)]">Read in:</span>
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm font-medium outline-none"
              style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              disabled={translating}
            >
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            {translating && (
              <span className="text-xs text-indigo-400 animate-pulse">Translating...</span>
            )}
          </div>
        </div>
      </section>

      {/* Write Post Button + Form */}
      <section className="pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-2.5 bg-indigo-500 text-white text-sm font-bold rounded-lg hover:bg-indigo-600 transition-colors"
            >
              {showForm ? 'Cancel' : 'Write a Post'}
            </button>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4 mb-8 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Your Name</label>
                    <input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full border rounded-lg p-3 text-sm outline-none"
                      style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                      placeholder="Anonymous"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Writing Language</label>
                    <select
                      value={postLang}
                      onChange={(e) => setPostLang(e.target.value)}
                      className="w-full border rounded-lg p-3 text-sm outline-none"
                      style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    >
                      {Object.entries(LANGUAGES).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border rounded-lg p-3 text-sm outline-none"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    placeholder="e.g. How I automated 500 WhatsApp messages per day with BotWave"
                    maxLength={200}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full border rounded-lg p-4 text-sm min-h-[200px] resize-y outline-none"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    placeholder="Share your story, tip, or guide..."
                    maxLength={10000}
                    required
                  />
                  <span className="text-xs text-[var(--text-muted)]">{content.length}/10000</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || title.trim().length < 3 || content.trim().length < 20}
                  className="w-full py-3 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Post'}
                </button>

                {submitResult && (
                  <div className={`p-3 rounded-lg text-sm ${submitResult.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {submitResult.message}
                  </div>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Posts List */}
      <section className="pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-4">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
              <p className="text-[var(--text-secondary)] text-lg mb-2">No posts yet</p>
              <p className="text-[var(--text-muted)] text-sm">
                Be the first to share something with the BotWave community!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3 text-xs text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text-secondary)]">{post.author_name}</span>
                    <span>·</span>
                    <span>{formatDate(post.created_at)}</span>
                    {post.display_lang !== post.original_lang && (
                      <>
                        <span>·</span>
                        <span className="text-indigo-400">
                          Translated from {LANGUAGES[post.original_lang] || post.original_lang}
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">{post.title}</h2>
                  <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {post.body.length > 600
                      ? post.body.slice(0, 600) + '...'
                      : post.body}
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 px-6 bg-[var(--surface)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Why Guest Posts Matter
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Share your expertise, help others automate their messaging workflows,
            and build your reputation in the BotWave community. Every post is
            AI-translated into 16+ languages so readers worldwide can benefit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Auto-Translated', desc: 'Write in any language — BotWave AI translates your post for every reader.' },
              { title: 'Community-Driven', desc: 'Real stories from real bot builders. Tips, guides, and automation workflows.' },
              { title: 'SEO-Boosted', desc: 'Your post gets indexed in multiple languages, reaching a global audience.' },
            ].map(item => (
              <div key={item.title} className="p-4">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

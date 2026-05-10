'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface Mailbox {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  dailySendCount: number;
  dailySendLimit: number;
}

interface Email {
  id: string;
  direction: string;
  from_address: string;
  from_name: string;
  to_address: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_read: boolean;
  is_starred: boolean;
  is_spam: boolean;
  folder: string;
  created_at: string;
}

type Folder = 'inbox' | 'sent' | 'spam' | 'trash';

const FOLDERS: { key: Folder; label: string; icon: string }[] = [
  { key: 'inbox', label: 'Inbox', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'sent', label: 'Sent', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
  { key: 'spam', label: 'Spam', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { key: 'trash', label: 'Trash', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
];

export default function MailboxPage() {
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [folder, setFolder] = useState<Folder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/mailbox?folder=${folder}`);
      const data = await res.json();
      if (data.success) {
        setMailbox(data.data.mailbox);
        setEmails(data.data.emails);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch mailbox:', err);
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    setLoading(true);
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    const interval = setInterval(fetchEmails, 30_000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const handleAction = async (emailId: string, action: string) => {
    try {
      await fetch('/api/user/mailbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, action }),
      });
      fetchEmails();
      if (selectedEmail?.id === emailId && (action === 'trash' || action === 'spam')) {
        setSelectedEmail(null);
      }
    } catch { /* ignore */ }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/user/mailbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compose),
      });
      const data = await res.json();
      if (data.success) {
        setToast('Email sent!');
        setShowCompose(false);
        setCompose({ to: '', subject: '', body: '' });
        if (folder === 'sent') fetchEmails();
      } else {
        setToast(data.error || 'Failed to send');
      }
    } catch {
      setToast('Network error');
    } finally {
      setSending(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const openEmail = (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      handleAction(email.id, 'read');
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading && !mailbox) {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <DashboardNav />
        <div className="flex items-center justify-center h-64 pt-24">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mailbox</h1>
          {mailbox && (
            <p className="text-sm text-slate-500 font-mono mt-1">
              {mailbox.email} &middot; {mailbox.dailySendCount}/{mailbox.dailySendLimit} sent today
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Compose
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 right-4 z-50 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          {FOLDERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFolder(f.key); setSelectedEmail(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                folder === f.key
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
              </svg>
              {f.label}
              {f.key === 'inbox' && unreadCount > 0 && (
                <span className="ml-auto bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Email List / Detail */}
        <div className="flex-1 min-w-0">
          {selectedEmail ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/5 border border-white/5 rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ← Back
                </button>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => handleAction(selectedEmail.id, selectedEmail.is_starred ? 'unstar' : 'star')}
                    className={`text-sm px-2 py-1 rounded ${selectedEmail.is_starred ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
                  >
                    {selectedEmail.is_starred ? '★' : '☆'}
                  </button>
                  <button onClick={() => handleAction(selectedEmail.id, 'trash')} className="text-sm text-gray-500 hover:text-red-400 px-2 py-1">Delete</button>
                  <button onClick={() => handleAction(selectedEmail.id, 'spam')} className="text-sm text-gray-500 hover:text-yellow-400 px-2 py-1">Spam</button>
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-2">{selectedEmail.subject || '(no subject)'}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <span className="font-medium text-gray-300">{selectedEmail.from_name || selectedEmail.from_address}</span>
                  <span>&lt;{selectedEmail.from_address}&gt;</span>
                  <span className="ml-auto">{new Date(selectedEmail.created_at).toLocaleString()}</span>
                </div>
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || selectedEmail.body_text || '' }}
                />
              </div>
            </motion.div>
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
              {emails.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p className="text-lg font-medium">No emails in {folder}</p>
                  <p className="text-sm mt-1">
                    {folder === 'inbox' ? 'Your inbox is empty' : `Nothing in ${folder}`}
                  </p>
                  {folder === 'inbox' && (
                    <p className="text-xs text-amber-400/80 mt-3">
                      Expecting an email? Check your <span className="font-semibold">spam/junk folder</span> in your email provider — emails from new senders sometimes land there.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {emails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => openEmail(email)}
                      className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${
                        !email.is_read ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${!email.is_read ? 'bg-emerald-400' : 'bg-transparent'}`} />
                        <span className={`text-sm truncate w-36 ${!email.is_read ? 'font-semibold text-white' : 'text-gray-400'}`}>
                          {email.direction === 'outbound' ? `To: ${email.to_address}` : (email.from_name || email.from_address)}
                        </span>
                        <span className={`text-sm truncate flex-1 ${!email.is_read ? 'text-gray-200' : 'text-gray-500'}`}>
                          {email.subject || '(no subject)'}
                        </span>
                        {email.is_starred && <span className="text-yellow-400 text-sm">★</span>}
                        <span className="text-xs text-gray-600 shrink-0">{formatDate(email.created_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompose(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-[#0d0d14] border border-white/10 rounded-xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">New Email</h3>
              {mailbox && (
                <p className="text-xs text-gray-500 font-mono mb-4">From: {mailbox.email}</p>
              )}
              <form onSubmit={handleSend} className="space-y-4">
                <input
                  type="email"
                  value={compose.to}
                  onChange={(e) => setCompose((p) => ({ ...p, to: e.target.value }))}
                  required
                  placeholder="To"
                  className="w-full bg-[#0a0a0f] border border-white/10 px-3 py-2.5 rounded-lg text-white text-sm focus:border-emerald-500/50 focus:outline-none"
                />
                <input
                  type="text"
                  value={compose.subject}
                  onChange={(e) => setCompose((p) => ({ ...p, subject: e.target.value }))}
                  required
                  placeholder="Subject"
                  className="w-full bg-[#0a0a0f] border border-white/10 px-3 py-2.5 rounded-lg text-white text-sm focus:border-emerald-500/50 focus:outline-none"
                />
                <textarea
                  value={compose.body}
                  onChange={(e) => setCompose((p) => ({ ...p, body: e.target.value }))}
                  required
                  rows={6}
                  placeholder="Write your email..."
                  className="w-full bg-[#0a0a0f] border border-white/10 px-3 py-2.5 rounded-lg text-white text-sm focus:border-emerald-500/50 focus:outline-none resize-none"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="text-gray-400 hover:text-white px-4 py-2 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </main>
  );
}

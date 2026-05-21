'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface Mailbox {
  id: string;
  email: string;
  displayName: string;
  label: string;
  isActive: boolean;
  dailySendCount: number;
  dailySendLimit: number;
}

interface MailboxSummary {
  id: string;
  email: string;
  label: string;
  isActive: boolean;
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
  const [allMailboxes, setAllMailboxes] = useState<MailboxSummary[]>([]);
  const [canCreateMore, setCanCreateMore] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [folder, setFolder] = useState<Folder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [activeMailboxId, setActiveMailboxId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('botwave_active_mailbox') || null;
    }
    return null;
  });
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newLocalPart, setNewLocalPart] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const fetchEmails = useCallback(async () => {
    try {
      const params = new URLSearchParams({ folder });
      if (activeMailboxId) params.set('mailboxId', activeMailboxId);
      const res = await fetch(`/api/user/mailbox?${params}`);
      const data = await res.json();
      if (data.success) {
        setMailbox(data.data.mailbox);
        setAllMailboxes(data.data.allMailboxes || []);
        setCanCreateMore(data.data.canCreateMore || false);
        setEmails(data.data.emails);
        setUnreadCount(data.data.unreadCount);
        if (!activeMailboxId && data.data.mailbox) {
          setActiveMailboxId(data.data.mailbox.id);
          try { localStorage.setItem('botwave_active_mailbox', data.data.mailbox.id); } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to fetch mailbox:', err);
    } finally {
      setLoading(false);
    }
  }, [folder, activeMailboxId]);

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
        body: JSON.stringify({ emailId, action, mailboxId: activeMailboxId }),
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
        body: JSON.stringify({ ...compose, mailboxId: activeMailboxId }),
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

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/user/mailbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localPart: newLocalPart, label: newLabel || newLocalPart }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(`Created ${data.mailbox.email}`);
        setShowNewAddress(false);
        setNewLocalPart('');
        setNewLabel('');
        setActiveMailboxId(data.mailbox.id);
        fetchEmails();
      } else {
        setToast(data.error || 'Failed to create address');
      }
    } catch {
      setToast('Network error');
    } finally {
      setCreating(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const switchMailbox = (id: string) => {
    setActiveMailboxId(id);
    setSelectedEmail(null);
    setEmails([]);
    setLoading(true);
    setShowSwitcher(false);
    try { localStorage.setItem('botwave_active_mailbox', id); } catch {}
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
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Mailbox</h1>
          {mailbox && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              {/* Address switcher */}
              {allMailboxes.length > 1 ? (
                <div className="relative max-w-full">
                  <button
                    onClick={() => setShowSwitcher(!showSwitcher)}
                    className="text-xs sm:text-sm text-slate-400 font-mono hover:text-blue-500 transition-colors flex items-center gap-1 max-w-full"
                  >
                    <span className="truncate">{mailbox.email}</span>
                    <svg className={`w-3 h-3 shrink-0 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {showSwitcher && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 mt-1 bg-[#0d0d14] border border-white/10 rounded-lg shadow-xl z-50 min-w-[240px] sm:min-w-[280px] max-w-[calc(100vw-2rem)]"
                      >
                        {allMailboxes.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => switchMailbox(m.id)}
                            className={`w-full text-left px-3 sm:px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                              m.id === mailbox.id
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-xs truncate">{m.email}</div>
                              <div className="text-[10px] text-gray-600 truncate">{m.label}</div>
                            </div>
                            {m.id === mailbox.id && <span className="text-blue-500 text-xs shrink-0">Active</span>}
                          </button>
                        ))}
                        {canCreateMore && (
                          <button
                            onClick={() => { setShowNewAddress(true); setShowSwitcher(false); }}
                            className="w-full text-left px-3 sm:px-4 py-2.5 text-sm text-blue-500 hover:bg-blue-500/10 transition-colors border-t border-white/5"
                          >
                            + Generate New Address
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <span className="text-xs sm:text-sm text-slate-500 font-mono truncate max-w-[14rem] sm:max-w-none">{mailbox.email}</span>
              )}
              <span className="text-xs sm:text-sm text-slate-600 hidden sm:inline">&middot;</span>
              <span className="text-xs sm:text-sm text-slate-500">{mailbox.dailySendCount}/{mailbox.dailySendLimit} sent today</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 sm:gap-2">
          {canCreateMore && allMailboxes.length <= 1 && (
            <button
              onClick={() => setShowNewAddress(true)}
              className="flex-1 sm:flex-initial bg-white/5 hover:bg-white/10 text-gray-300 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border border-white/10 whitespace-nowrap"
            >
              + New Address
            </button>
          )}
          <button
            onClick={() => setShowCompose(true)}
            className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
          >
            Compose
          </button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 right-4 z-50 bg-blue-500/10 border border-blue-500/20 text-blue-500 px-4 py-2 rounded-lg text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Mobile: horizontal folder tabs across the top.
            Desktop: vertical sidebar on the left. */}
        <div className="sm:w-48 sm:shrink-0">
          <div className="flex sm:block gap-1 sm:gap-0 overflow-x-auto sm:overflow-visible -mx-3 sm:mx-0 px-3 sm:px-0 pb-1 sm:pb-0">
            {FOLDERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setFolder(f.key); setSelectedEmail(null); }}
                className={`shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-lg text-sm font-medium sm:mb-0.5 transition-colors whitespace-nowrap ${
                  folder === f.key
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                </svg>
                {f.label}
                {f.key === 'inbox' && unreadCount > 0 && (
                  <span className="sm:ml-auto bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Email List / Detail */}
        <div className="flex-1 min-w-0">
          {selectedEmail ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/5 border border-white/5 rounded-xl overflow-hidden"
            >
              <div className="p-3 sm:p-4 border-b border-white/5 flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base shrink-0"
                >
                  ← Back
                </button>
                <div className="flex gap-1 sm:gap-2 ml-auto">
                  <button
                    onClick={() => handleAction(selectedEmail.id, selectedEmail.is_starred ? 'unstar' : 'star')}
                    aria-label={selectedEmail.is_starred ? 'Unstar' : 'Star'}
                    className={`text-base sm:text-sm px-2 py-1 rounded ${selectedEmail.is_starred ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
                  >
                    {selectedEmail.is_starred ? '★' : '☆'}
                  </button>
                  <button onClick={() => handleAction(selectedEmail.id, 'trash')} className="text-xs sm:text-sm text-gray-500 hover:text-red-400 px-2 py-1">Delete</button>
                  <button onClick={() => handleAction(selectedEmail.id, 'spam')} className="text-xs sm:text-sm text-gray-500 hover:text-yellow-400 px-2 py-1">Spam</button>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-2 break-words">{selectedEmail.subject || '(no subject)'}</h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-400 mb-4">
                  <span className="font-medium text-gray-300 truncate max-w-full">{selectedEmail.from_name || selectedEmail.from_address}</span>
                  <span className="truncate max-w-full break-all">&lt;{selectedEmail.from_address}&gt;</span>
                  <span className="sm:ml-auto text-gray-500">{new Date(selectedEmail.created_at).toLocaleString()}</span>
                </div>
                <div
                  className="prose prose-invert prose-sm max-w-none overflow-x-auto break-words [&_img]:max-w-full [&_img]:h-auto [&_table]:max-w-full [&_table]:block [&_table]:overflow-x-auto"
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
                      Expecting an email? Check your <span className="font-semibold">spam/junk folder</span> in your email provider - emails from new senders sometimes land there.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {emails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => openEmail(email)}
                      className={`w-full text-left px-3 sm:px-4 py-3 hover:bg-white/5 transition-colors ${
                        !email.is_read ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      {/* Mobile: stacked two-line layout. Desktop: single-line. */}
                      <div className="flex sm:items-center gap-2 sm:gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 sm:mt-0 ${!email.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                          <div className="flex items-center justify-between gap-2 sm:contents">
                            <span className={`text-sm truncate sm:w-36 sm:shrink-0 ${!email.is_read ? 'font-semibold text-white' : 'text-gray-400'}`}>
                              {email.direction === 'outbound' ? `To: ${email.to_address}` : (email.from_name || email.from_address)}
                            </span>
                            <span className="text-xs text-gray-600 shrink-0 sm:order-3 sm:ml-auto">{formatDate(email.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 sm:mt-0 sm:flex-1 min-w-0">
                            <span className={`text-sm truncate flex-1 ${!email.is_read ? 'text-gray-200' : 'text-gray-500'}`}>
                              {email.subject || '(no subject)'}
                            </span>
                            {email.is_starred && <span className="text-yellow-400 text-sm shrink-0">★</span>}
                          </div>
                        </div>
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
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowCompose(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-[#0d0d14] border border-white/10 rounded-t-xl sm:rounded-xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
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
                  className="w-full bg-[#0a0a0f] border border-white/10 px-3 py-2.5 rounded-lg text-white text-sm focus:border-blue-500/50 focus:outline-none"
                />
                <input
                  type="text"
                  value={compose.subject}
                  onChange={(e) => setCompose((p) => ({ ...p, subject: e.target.value }))}
                  required
                  placeholder="Subject"
                  className="w-full bg-[#0a0a0f] border border-white/10 px-3 py-2.5 rounded-lg text-white text-sm focus:border-blue-500/50 focus:outline-none"
                />
                <textarea
                  value={compose.body}
                  onChange={(e) => setCompose((p) => ({ ...p, body: e.target.value }))}
                  required
                  rows={6}
                  placeholder="Write your email..."
                  className="w-full bg-[#0a0a0f] border border-white/10 px-3 py-2.5 rounded-lg text-white text-sm focus:border-blue-500/50 focus:outline-none resize-none"
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
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Address Modal */}
      <AnimatePresence>
        {showNewAddress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowNewAddress(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-[#0d0d14] border border-white/10 rounded-t-xl sm:rounded-xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Generate New Email Address</h3>
              <p className="text-xs text-gray-500 mb-4">Create a new @mail.botwave.online address with its own inbox.</p>
              <form onSubmit={handleCreateAddress} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email Address</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-0">
                    <input
                      type="text"
                      value={newLocalPart}
                      onChange={(e) => setNewLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      required
                      placeholder="yourname"
                      maxLength={30}
                      className="flex-1 bg-[#0a0a0f] border border-white/10 sm:border-r-0 px-3 py-2.5 rounded-lg sm:rounded-r-none text-white text-sm focus:border-blue-500/50 focus:outline-none font-mono min-w-0"
                    />
                    <span className="bg-[#111118] border border-white/10 sm:border-l-0 px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-l-none text-gray-500 text-xs sm:text-sm font-mono whitespace-nowrap mt-1 sm:mt-0">
                      @mail.botwave.online
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Label (optional)</label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Work, Personal, Shopping..."
                    maxLength={30}
                    className="w-full bg-[#0a0a0f] border border-white/10 px-3 py-2.5 rounded-lg text-white text-sm focus:border-blue-500/50 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewAddress(false)}
                    className="text-gray-400 hover:text-white px-4 py-2 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || newLocalPart.length < 2}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Address'}
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

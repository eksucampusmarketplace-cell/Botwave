

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string;
  message: string;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  related?: string[];
  timestamp: number;
}

type View = 'list' | 'chat' | 'new';
type Tab = 'ai' | 'tickets';

const SUGGESTED_QUESTIONS = [
  'What is BotWave?',
  'How do I set up?',
  'What are the pricing plans?',
  'How do I make stickers?',
  'Is my data safe?',
  'What commands are available?',
];

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('ai');
  const [view, setView] = useState<View>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // AI chatbot state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: "Hi! I'm BotWave AI. Ask me anything about BotWave - commands, features, pricing, troubleshooting, and more!", timestamp: Date.now() },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/support/tickets');
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets?ticketId=${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages);
        if (data.data.ticket) {
          setActiveTicket(data.data.ticket);
        }
      }
    } catch {
      // silent
    }
  }, []);

  // Poll for new messages when chat is open
  useEffect(() => {
    if (isOpen && tab === 'tickets' && view === 'chat' && activeTicket) {
      pollRef.current = setInterval(() => fetchMessages(activeTicket.id), 5000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
    if (isOpen && tab === 'tickets' && view === 'list') {
      pollRef.current = setInterval(fetchTickets, 10000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
    return undefined;
  }, [isOpen, tab, view, activeTicket, fetchMessages, fetchTickets]);

  useEffect(() => {
    if (isOpen && tab === 'tickets' && view === 'list') {
      setLoading(true);
      fetchTickets().finally(() => setLoading(false));
    }
  }, [isOpen, tab, view, fetchTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Check unread on mount
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const res = await fetch('/api/support/tickets');
        const data = await res.json();
        if (data.success) {
          const openTickets = data.data.filter((t: Ticket) => t.status === 'open' || t.status === 'in_progress');
          setUnreadCount(openTickets.length);
        }
      } catch {
        // silent
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch('/api/support/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setActiveTicket(ticket);
    setView('chat');
    setLoading(true);
    await fetchMessages(ticket.id);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeTicket || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: activeTicket.id, message: newMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        await fetchMessages(activeTicket.id);
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const createTicket = async () => {
    if (!newSubject.trim() || !newBody.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newSubject.trim(),
          message: newBody.trim(),
          priority: newPriority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewSubject('');
        setNewBody('');
        setNewPriority('normal');
        setActiveTicket(data.data);
        setView('chat');
        await fetchMessages(data.data.id);
        await fetchTickets();
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  // AI chatbot send
  const sendChatMessage = async (question?: string) => {
    const q = (question || chatInput).trim();
    if (!q || chatLoading) return;
    setChatInput('');

    const userMsg: ChatMessage = { role: 'user', text: q, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, sessionId: chatSessionId }),
      });
      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          role: 'bot',
          text: data.data.answer,
          related: data.data.related,
          timestamp: Date.now(),
        };
        setChatMessages(prev => [...prev, botMsg]);
        // If AI escalated to human, auto-switch to tickets tab
        if (data.data.wantsHuman) {
          setTimeout(() => setTab('tickets'), 2000);
        }
      } else {
        setChatMessages(prev => [...prev, {
          role: 'bot',
          text: 'Sorry, something went wrong. Please try again!',
          timestamp: Date.now(),
        }]);
      }
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'bot',
        text: 'Unable to reach the server. Please try again later.',
        timestamp: Date.now(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-yellow-400 bg-yellow-400/10';
      case 'in_progress': return 'text-cyan-400 bg-cyan-400/10';
      case 'resolved': return 'text-green-400 bg-green-400/10';
      case 'closed': return 'text-zinc-500 bg-zinc-500/10';
      default: return 'text-zinc-400 bg-zinc-400/10';
    }
  };

  const priorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'normal': return '🟢';
      case 'low': return '⚪';
      default: return '🟢';
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white shadow-lg flex items-center justify-center transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{ boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-[9998] w-[360px] max-w-[calc(100vw-32px)] h-[500px] max-h-[calc(100vh-140px)] bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
          >
            {/* Tab Switcher */}
            <div className="bg-[var(--surface)] border-b border-[var(--border)] flex shrink-0">
              <button
                onClick={() => { setTab('ai'); setView('list'); }}
                className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors relative ${
                  tab === 'ai'
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7l-1 3H10l-1-3c-2-1.5-4-4-4-7a7 7 0 0 1 7-7z" />
                    <line x1="10" y1="22" x2="14" y2="22" />
                  </svg>
                  QUICK HELP
                </span>
                {tab === 'ai' && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--primary)] rounded-full" />}
              </button>
              <button
                onClick={() => setTab('tickets')}
                className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors relative ${
                  tab === 'tickets'
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  TICKETS
                  {unreadCount > 0 && (
                    <span className="w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                      {unreadCount}
                    </span>
                  )}
                </span>
                {tab === 'tickets' && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--primary)] rounded-full" />}
              </button>
            </div>

            {/* AI CHATBOT TAB */}
            {tab === 'ai' && (
              <>
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                          msg.role === 'user'
                            ? 'bg-[var(--primary)] text-white rounded-br-md'
                            : 'bg-[var(--surface-light)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border)]'
                        }`}
                      >
                        {msg.role === 'bot' && (
                          <p className="text-[9px] font-mono text-[var(--primary)] mb-1 font-bold">BOTWAVE AI</p>
                        )}
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        {msg.related && msg.related.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-[var(--border)]">
                            <p className="text-[10px] text-[var(--text-muted)] mb-1">Related topics:</p>
                            {msg.related.map((r, ri) => (
                              <button
                                key={ri}
                                onClick={() => sendChatMessage(r)}
                                className="block text-left text-[11px] text-[var(--primary)] hover:underline py-0.5"
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--surface-light)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />

                  {/* Suggested questions (only show at start) */}
                  {chatMessages.length <= 1 && (
                    <div className="pt-2">
                      <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider mb-2">Popular questions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_QUESTIONS.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => sendChatMessage(q)}
                            className="text-[11px] px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Chat Input */}
                <div className="border-t border-[var(--border)] p-3 shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                      placeholder="Ask anything about BotWave..."
                      className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={() => sendChatMessage()}
                      disabled={!chatInput.trim() || chatLoading}
                      className="w-10 h-10 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 flex items-center justify-center transition-colors shrink-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={() => sendChatMessage('talk to human')}
                    className="text-xs text-[var(--primary)] hover:underline mt-1.5 font-medium"
                  >
                    Need a real person? Click here
                  </button>
                </div>
              </>
            )}

            {/* TICKETS TAB */}
            {tab === 'tickets' && (
              <>
                {/* Header */}
                <div className="bg-[var(--surface)] border-b border-[var(--border)] p-4 flex items-center justify-between shrink-0">
                  {view === 'list' ? (
                    <>
                      <div>
                        <h3 className="font-bold text-sm text-[var(--text-primary)]">Support Tickets</h3>
                        <p className="text-[10px] text-[var(--text-muted)] font-mono">We typically reply within a few hours</p>
                      </div>
                      <button
                        onClick={() => setView('new')}
                        className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 flex items-center justify-center transition-colors"
                        title="New ticket"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setView('list'); setActiveTicket(null); setMessages([]); }}
                        className="w-8 h-8 rounded-lg hover:bg-[var(--surface-light)] flex items-center justify-center transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <div className="flex-1 ml-2 min-w-0">
                        <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                          {view === 'new' ? 'New Ticket' : activeTicket?.subject}
                        </h3>
                        {activeTicket && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${statusColor(activeTicket.status)}`}>
                            {activeTicket.status.toUpperCase().replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Notification banner */}
                {!notificationsEnabled && view === 'list' && (
                  <button
                    onClick={enableNotifications}
                    className="bg-[var(--primary)]/10 border-b border-[var(--border)] px-4 py-2 flex items-center gap-2 hover:bg-[var(--primary)]/15 transition-colors shrink-0"
                  >
                    <span className="text-sm">🔔</span>
                    <span className="text-[11px] text-[var(--primary)] font-medium">Enable push notifications for replies</span>
                  </button>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                  {/* Ticket List View */}
                  {view === 'list' && (
                    <div className="p-2">
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : tickets.length === 0 ? (
                        <div className="text-center py-12 px-4">
                          <div className="text-3xl mb-3">💬</div>
                          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No conversations yet</p>
                          <p className="text-xs text-[var(--text-muted)] mb-4">Start a conversation with our support team</p>
                          <button
                            onClick={() => setView('new')}
                            className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                          >
                            New Ticket
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {tickets.map((ticket) => (
                            <button
                              key={ticket.id}
                              onClick={() => openTicket(ticket)}
                              className="w-full text-left p-3 rounded-lg hover:bg-[var(--surface-light)] transition-colors group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs">{priorityIcon(ticket.priority)}</span>
                                    <span className="text-sm font-medium text-[var(--text-primary)] truncate block">
                                      {ticket.subject}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${statusColor(ticket.status)}`}>
                                      {ticket.status.toUpperCase().replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)]">
                                      {timeAgo(ticket.updated_at)}
                                    </span>
                                  </div>
                                </div>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat View */}
                  {view === 'chat' && (
                    <div className="p-3 space-y-3">
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : messages.length === 0 ? (
                        <p className="text-center text-xs text-[var(--text-muted)] py-8">No messages yet</p>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                                msg.sender_type === 'user'
                                  ? 'bg-[var(--primary)] text-white rounded-br-md'
                                  : 'bg-[var(--surface-light)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border)]'
                              }`}
                            >
                              {msg.sender_type === 'admin' && (
                                <p className="text-[9px] font-mono text-[var(--primary)] mb-1 font-bold">BOTWAVE SUPPORT</p>
                              )}
                              <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                              <p className={`text-[9px] mt-1 ${
                                msg.sender_type === 'user' ? 'text-white/60' : 'text-[var(--text-muted)]'
                              }`}>
                                {timeAgo(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  {/* New Ticket View */}
                  {view === 'new' && (
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Subject</label>
                        <input
                          type="text"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          placeholder="What do you need help with?"
                          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                          maxLength={100}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Priority</label>
                        <div className="flex gap-2">
                          {['low', 'normal', 'high', 'urgent'].map((p) => (
                            <button
                              key={p}
                              onClick={() => setNewPriority(p)}
                              className={`flex-1 text-[10px] font-mono py-2 rounded-lg border transition-colors ${
                                newPriority === p
                                  ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]'
                                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-light)]'
                              }`}
                            >
                              {priorityIcon(p)} {p.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Message</label>
                        <textarea
                          value={newBody}
                          onChange={(e) => setNewBody(e.target.value)}
                          placeholder="Describe your issue in detail..."
                          rows={4}
                          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
                        />
                      </div>
                      <button
                        onClick={createTicket}
                        disabled={!newSubject.trim() || !newBody.trim() || sending}
                        className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-lg transition-colors"
                      >
                        {sending ? 'Sending...' : 'Submit Ticket'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Input (Chat View) */}
                {view === 'chat' && activeTicket && activeTicket.status !== 'closed' && (
                  <div className="border-t border-[var(--border)] p-3 shrink-0">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Type a message..."
                        className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="w-10 h-10 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 flex items-center justify-center transition-colors shrink-0"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Closed ticket notice */}
                {view === 'chat' && activeTicket?.status === 'closed' && (
                  <div className="border-t border-[var(--border)] p-3 shrink-0">
                    <p className="text-center text-xs text-[var(--text-muted)]">This ticket is closed. Send a message to reopen it.</p>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Type to reopen..."
                        className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="w-10 h-10 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 flex items-center justify-center transition-colors shrink-0"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

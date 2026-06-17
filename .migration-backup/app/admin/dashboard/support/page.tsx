'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  username?: string;
  last_message?: {
    message: string;
    sender_type: string;
    created_at: string;
  } | null;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string;
  message: string;
  created_at: string;
}

interface Stats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/support?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // silent
    }
  }, [statusFilter]);

  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`/api/admin/support?ticketId=${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages);
        if (data.data.ticket) {
          setActiveTicket(prev => prev ? { ...prev, ...data.data.ticket } : data.data.ticket);
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  useEffect(() => {
    if (activeTicket) {
      pollRef.current = setInterval(() => fetchMessages(activeTicket.id), 5000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
    pollRef.current = setInterval(fetchTickets, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeTicket, fetchMessages, fetchTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || !activeTicket || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: activeTicket.id, message: reply.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setReply('');
        await fetchMessages(activeTicket.id);
        await fetchTickets();
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status }),
      });
      await fetchTickets();
      if (activeTicket?.id === ticketId) {
        await fetchMessages(ticketId);
      }
    } catch {
      // silent
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setActiveTicket(ticket);
    await fetchMessages(ticket.id);
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

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'normal': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'low': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-yellow-400 bg-yellow-500/10';
      case 'in_progress': return 'text-cyan-400 bg-cyan-500/10';
      case 'resolved': return 'text-green-400 bg-green-500/10';
      case 'closed': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <p className="text-sm text-gray-400 mt-1">Manage and respond to user support requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-white/5' },
          { label: 'Open', value: stats.open, color: 'text-yellow-400', bg: 'bg-yellow-500/5' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-cyan-400', bg: 'bg-cyan-500/5' },
          { label: 'Resolved', value: stats.resolved, color: 'text-green-400', bg: 'bg-green-500/5' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-white/5 rounded-xl p-4`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-[60vh]">
        {/* Ticket List */}
        <div className={`${activeTicket ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] bg-[#0d0d14] border border-white/5 rounded-xl overflow-hidden`}>
          {/* Filter Tabs */}
          <div className="flex border-b border-white/5 overflow-x-auto shrink-0">
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === f
                    ? 'text-red-400 border-b-2 border-red-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {f === 'in_progress' ? 'Active' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Tickets */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">No tickets found</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                    activeTicket?.id === ticket.id ? 'bg-red-500/5 border-l-2 border-l-red-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ticket.username || 'Unknown'} &middot; {timeAgo(ticket.updated_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor(ticket.status)}`}>
                        {ticket.status === 'in_progress' ? 'ACTIVE' : ticket.status.toUpperCase()}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  {ticket.last_message && (
                    <p className="text-xs text-gray-600 mt-1.5 truncate">
                      {ticket.last_message.sender_type === 'admin' ? 'You: ' : ''}
                      {ticket.last_message.message}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 bg-[#0d0d14] border border-white/5 rounded-xl flex flex-col overflow-hidden">
          {activeTicket ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-white/5 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveTicket(null)}
                    className="lg:hidden p-1 text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{activeTicket.subject}</p>
                    <p className="text-xs text-gray-500">
                      {activeTicket.username || 'Unknown'} &middot; Created {timeAgo(activeTicket.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={activeTicket.status}
                    onChange={(e) => updateTicketStatus(activeTicket.id, e.target.value)}
                    className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none focus:border-red-500/50"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.sender_type === 'admin'
                        ? 'bg-red-500/10 text-red-100 border border-red-500/20 rounded-br-md'
                        : 'bg-white/5 text-gray-200 border border-white/10 rounded-bl-md'
                    }`}>
                      <p className="text-[10px] font-mono mb-1 opacity-60">
                        {msg.sender_type === 'admin' ? `Admin (${msg.sender_id})` : 'User'} &middot; {timeAgo(msg.created_at)}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              <div className="border-t border-white/5 p-3 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendReply()}
                    placeholder="Type your reply..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">Select a ticket to start responding</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

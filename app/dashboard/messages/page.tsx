'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  session_id: string;
  sender_jid: string;
  sender_name: string | null;
  content: string | null;
  message_type: string;
  timestamp: string;
  is_group: boolean;
  group_jid: string | null;
}

const typeIcons: Record<string, string> = {
  text: '💬',
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  sticker: '🎴',
  document: '📄',
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/bot/messages?${params}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        setTotalPages(data.pages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      fetchMessages();
    };
    checkUser();
  }, [fetchMessages]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMessages();
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSender = (msg: Message) => {
    if (msg.sender_name) return msg.sender_name;
    const jid = msg.sender_jid || '';
    return jid.split('@')[0] || 'Unknown';
  };

  return (
    <main className="min-h-screen bg-dark relative">
      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[2px]">
            MESSAGE <span className="text-green">HISTORY</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Browse all messages processed by your bot ({total.toLocaleString()} total)
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-card border border-green/10 p-4 mb-6 relative"
        >
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages or senders..."
              className="flex-1 bg-dark border border-green/20 px-4 py-2 text-white font-mono text-sm focus:border-green focus:outline-none transition-colors"
            />
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-dark border border-green/20 px-4 py-2 text-white font-mono text-sm focus:border-green focus:outline-none"
            >
              <option value="">ALL TYPES</option>
              <option value="text">TEXT</option>
              <option value="image">IMAGE</option>
              <option value="video">VIDEO</option>
              <option value="audio">AUDIO</option>
              <option value="sticker">STICKER</option>
              <option value="document">DOCUMENT</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-green text-dark font-mono text-xs font-bold tracking-[2px] hover:bg-cyan transition-colors"
            >
              SEARCH
            </button>
          </form>
        </motion.div>

        {/* Messages table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-card border border-green/10 relative"
        >
          <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
          <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />

          {loading ? (
            <div className="p-8 text-center">
              <p className="font-mono text-sm text-[#5a9a7a] animate-pulse tracking-[2px]">LOADING...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-mono text-sm text-[#5a9a7a]">No messages found</p>
              <p className="font-mono text-[10px] text-[#3a6a5a] mt-2">
                Messages will appear here once your bot starts processing them
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-green/10">
                    <th className="px-4 py-3 text-left font-mono text-[10px] text-[#5a9a7a] tracking-[2px]">TYPE</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] text-[#5a9a7a] tracking-[2px]">SENDER</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] text-[#5a9a7a] tracking-[2px] hidden md:table-cell">CONTENT</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] text-[#5a9a7a] tracking-[2px]">TIME</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] text-[#5a9a7a] tracking-[2px] hidden sm:table-cell">SOURCE</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr key={msg.id} className="border-b border-green/5 hover:bg-green/5 transition-colors">
                      <td className="px-4 py-3 text-lg" title={msg.message_type}>
                        {typeIcons[msg.message_type] || '📨'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-white">{formatSender(msg)}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell max-w-[300px]">
                        <span className="font-mono text-xs text-[#7abfa0] truncate block">
                          {msg.content || `[${msg.message_type}]`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-[#5a9a7a]">{formatTime(msg.timestamp)}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`font-mono text-[10px] px-2 py-1 ${msg.is_group ? 'bg-cyan/10 text-cyan' : 'bg-green/10 text-green'}`}>
                          {msg.is_group ? 'GROUP' : 'DM'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-green/10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="font-mono text-xs text-green hover:text-cyan transition-colors disabled:opacity-30 tracking-[2px]"
              >
                ← PREV
              </button>
              <span className="font-mono text-[10px] text-[#5a9a7a]">
                PAGE {page} OF {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="font-mono text-xs text-green hover:text-cyan transition-colors disabled:opacity-30 tracking-[2px]"
              >
                NEXT →
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

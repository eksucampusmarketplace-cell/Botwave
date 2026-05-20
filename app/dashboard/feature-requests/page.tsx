'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

interface FeatureRequest {
  id: string;
  user_identifier: string;
  platform: string;
  description: string;
  ai_response: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  needs_review: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const platformIcons: Record<string, string> = {
  telegram: 'TG',
  whatsapp: 'WA',
  web: 'WEB',
};

export default function FeatureRequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/admin/feature-requests?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRequests();
      }
    } catch {
      // Silently retry on next action
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusCounts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950">
      <DashboardNav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Feature Requests</h1>
              <p className="text-gray-400 text-sm mt-1">
                AI-analyzed feature suggestions from users
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{requests.length} total</span>
              {statusCounts.completed && (
                <span className="text-green-400">{statusCounts.completed} analyzed</span>
              )}
              {statusCounts.pending && (
                <span className="text-yellow-400">{statusCounts.pending} pending</span>
              )}
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'processing', 'completed', 'failed', 'needs_review'].map((status) => (
              <button
                key={status}
                onClick={() => { setFilterStatus(status); setLoading(true); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-4">Loading requests...</p>
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
              {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No feature requests yet</p>
              <p className="text-gray-600 text-sm mt-2">
                Users can submit ideas via !feature (WhatsApp), /feature (Telegram), or the web form.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-800 text-gray-300">
                          {platformIcons[req.platform] || req.platform}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${statusColors[req.status] || 'bg-gray-800 text-gray-400'}`}>
                          {req.status}
                        </span>
                        <span className="text-gray-600 text-xs">
                          {formatDate(req.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm font-medium truncate">
                        {req.user_identifier}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {req.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'completed' && req.ai_response && (
                        <button
                          onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors"
                        >
                          {expandedId === req.id ? 'Hide' : 'View'} AI Analysis
                        </button>
                      )}
                      {(req.status === 'failed' || req.status === 'pending') && (
                        <button
                          onClick={() => handleAction(req.id, 'reprocess')}
                          disabled={actionLoading === req.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === req.id ? 'Processing...' : 'Reprocess'}
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(req.id, 'delete')}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded AI response */}
                  {expandedId === req.id && req.ai_response && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-4 border-t border-gray-800"
                    >
                      <h4 className="text-sm font-semibold text-indigo-400 mb-2">
                        AI Analysis
                      </h4>
                      <div className="bg-gray-950 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {req.ai_response}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  username: string;
  created_at: string;
  signup_source: string;
  last_login_at: string | null;
  login_count: number;
  totalSessions: number;
  activeSessions: number;
  enabledFeatures: number;
  lastActive: string | null;
  sessions: Array<{
    id: string;
    phone_number: string;
    session_name: string;
    state: string;
    last_active: string | null;
  }>;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users?acquisition=true');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    if (!q) return true;
    return u.username?.toLowerCase().includes(q) ||
      u.sessions?.some(s => s.phone_number?.includes(q) || s.session_name?.toLowerCase().includes(q));
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} registered users</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm w-72 focus:outline-none focus:border-red-500"
        />
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">USER</th>
                  <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">SOURCE</th>
                  <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">SESSIONS</th>
                  <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">LOGINS</th>
                  <th className="text-left text-gray-400 text-xs font-mono px-4 py-3">JOINED</th>
                  <th className="text-right text-gray-400 text-xs font-mono px-4 py-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <>
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                      <td className="px-4 py-3">
                        <div className="text-white">{user.username || 'N/A'}</div>
                        <div className="text-gray-500 text-xs">{user.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded">{user.signup_source || 'direct'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-400">{user.activeSessions}</span>
                        <span className="text-gray-500">/{user.totalSessions}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{user.login_count || 0}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-xs text-gray-400 hover:text-white mr-2">
                          {expandedUser === user.id ? 'Collapse' : 'Expand'}
                        </button>
                      </td>
                    </tr>
                    {expandedUser === user.id && (
                      <tr key={`${user.id}-details`}>
                        <td colSpan={6} className="bg-white/[0.02] px-6 py-4 border-b border-white/5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div className="bg-white/5 rounded-lg p-3">
                              <span className="text-gray-400 text-xs">Features Enabled</span>
                              <p className="text-white font-bold">{user.enabledFeatures}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <span className="text-gray-400 text-xs">Last Login</span>
                              <p className="text-white text-sm">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <span className="text-gray-400 text-xs">Last Active</span>
                              <p className="text-white text-sm">{user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}</p>
                            </div>
                          </div>
                          {user.sessions.length > 0 && (
                            <div>
                              <p className="text-gray-400 text-xs mb-2">Sessions:</p>
                              {user.sessions.map(s => (
                                <div key={s.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2 mb-1 text-sm">
                                  <span className={`w-2 h-2 rounded-full ${s.state === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                                  <span className="text-white">{s.session_name}</span>
                                  <span className="text-gray-500 font-mono text-xs">{s.phone_number}</span>
                                  <span className="text-gray-500 text-xs ml-auto">{s.state}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {search ? 'No users matching search' : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

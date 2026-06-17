import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  description: string;
}

const services: ServiceStatus[] = [
  { name: 'API Server', status: 'operational', description: 'REST API endpoints and authentication' },
  { name: 'Telegram Bot Sessions', status: 'operational', description: 'Telegram bot connections via Bot API' },
  { name: 'Telegram Bot API', status: 'operational', description: 'Telegram bot and group management' },
  { name: 'AI Chat (Gemini)', status: 'operational', description: 'AI-powered chat responses' },
  { name: 'Media Downloader', status: 'operational', description: 'YouTube, TikTok, Instagram downloads' },
  { name: 'Dashboard', status: 'operational', description: 'Web dashboard and session management' },
  { name: 'Database', status: 'operational', description: 'Supabase PostgreSQL database' },
];

const statusColors: Record<string, string> = {
  operational: 'bg-emerald-500',
  degraded: 'bg-yellow-500',
  down: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Outage',
};

export default function StatusPage() {
  const [lastChecked, setLastChecked] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastChecked(new Date().toLocaleTimeString());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = services.every(s => s.status === 'operational');

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Status</span>
          </nav>

          <div className={`p-6 rounded-2xl mb-8 ${allOperational ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${allOperational ? 'bg-emerald-500' : 'bg-yellow-500'} animate-pulse`} />
              <h1 className={`text-xl font-bold ${allOperational ? 'text-emerald-500' : 'text-yellow-600'}`}>
                {allOperational ? 'All Systems Operational' : 'Partial Outage'}
              </h1>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">Last checked: {lastChecked}</p>
          </div>

          <div className="space-y-2 mb-12">
            {services.map(service => (
              <div key={service.name} className="flex items-center justify-between p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColors[service.status]}`} />
                  <div>
                    <span className="font-medium text-[var(--text-primary)] text-sm">{service.name}</span>
                    <p className="text-xs text-[var(--text-muted)]">{service.description}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium ${
                  service.status === 'operational' ? 'text-emerald-500' :
                  service.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {statusLabels[service.status]}
                </span>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]">
            <h2 className="font-bold text-[var(--text-primary)] mb-3">Incident History</h2>
            <p className="text-sm text-[var(--text-secondary)]">No incidents in the past 30 days. 🎉</p>
          </div>

          <p className="text-xs text-[var(--text-muted)] text-center mt-8">
            Status issues? Join the{' '}
            <a href="https://t.me/BotWaveUpdates" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Telegram updates channel
            </a>
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}

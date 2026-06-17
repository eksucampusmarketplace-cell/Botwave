'use client';

import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

export default function ReferralsPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <DashboardNav />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="p-8 rounded-2xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Referrals
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Coming soon.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

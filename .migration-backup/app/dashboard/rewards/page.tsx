'use client';

import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

export default function RewardsPage() {
  return (
    <main className="min-h-screen bg-dark relative">
      <DashboardNav />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="p-8 rounded-2xl border text-center bg-card border-blue-500/10">
            <h1 className="text-2xl font-bold mb-2 text-white">
              Rewards
            </h1>
            <p className="text-sm text-[#5a9a7a]">
              Rewards are currently unavailable.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

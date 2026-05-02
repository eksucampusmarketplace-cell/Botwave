'use client';

import { motion } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-dark relative">
      <DashboardNav />

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="font-display text-3xl md:text-4xl font-black text-white tracking-[2px]">
            SYSTEM <span className="text-green">SETTINGS</span>
          </h1>
          <p className="font-mono text-sm text-[#5a9a7a] mt-2">
            Configure your global bot preferences
          </p>
        </motion.div>

        <div className="bg-card border border-green/10 p-8 relative">
          <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-green/30" />
          <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-green/30" />
          
          <div className="space-y-8 max-w-2xl">
            <div>
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">PROFILE</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">USERNAME</label>
                  <input
                    type="text"
                    disabled
                    className="w-full bg-dark/50 border border-green/10 p-3 text-white font-mono text-sm"
                    placeholder="User"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">API CONFIGURATION</h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-[#5a9a7a] mb-1 tracking-[2px]">OPENAI API KEY</label>
                  <input
                    type="password"
                    className="w-full bg-dark border border-green/20 p-3 text-white font-mono text-sm focus:border-green outline-none"
                    placeholder="sk-..."
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm tracking-[3px] text-green mb-4">DANGER ZONE</h3>
              <button className="border border-red-400/50 text-red-400 px-6 py-3 font-mono text-xs tracking-[2px] hover:bg-red-400/10 transition-colors">
                DELETE ALL SESSIONS
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

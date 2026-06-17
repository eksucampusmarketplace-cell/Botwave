

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PWAInstallGuideProps {
  onInstallConfirmed: () => void;
}

export default function PWAInstallGuide({ onInstallConfirmed }: PWAInstallGuideProps) {
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if already installed as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        onInstallConfirmed();
      }
      setDeferredPrompt(null);
    }
  };

  const handleManualConfirm = () => {
    setIsInstalled(true);
    onInstallConfirmed();
  };

  if (isInstalled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green/10 border border-green/30 p-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <span className="text-green text-lg">&#10003;</span>
          <div>
            <p className="font-mono text-xs text-green tracking-[2px]">PWA INSTALLED</p>
            <p className="font-mono text-[10px] text-[#5a9a7a] mt-1">
              BotWave is running as an app. You can now connect your WhatsApp session.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-cyan/20 p-6 mb-6 relative"
    >
      <div className="absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2 border-cyan/30" />
      <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-cyan/30" />

      <h3 className="font-display text-sm tracking-[3px] text-cyan mb-4">
        INSTALL BOTWAVE APP FIRST
      </h3>
      <p className="font-mono text-[10px] text-[#5a9a7a] mb-6">
        You must install BotWave as an app on your device before connecting a WhatsApp session.
        This keeps the bot running in the background.
      </p>

      {deferredPrompt && (
        <button
          onClick={handleNativeInstall}
          className="w-full bg-cyan text-dark p-3 font-mono text-xs font-bold tracking-[2px] hover:bg-green transition-colors mb-4"
        >
          INSTALL BOTWAVE APP
        </button>
      )}

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {platform === 'android' && (
            <motion.div
              key="android"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h4 className="font-mono text-[10px] text-green tracking-[2px] mb-3">
                ANDROID - STEP BY STEP
              </h4>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Open this page in Chrome browser' },
                  { step: '2', text: 'Tap the three dots menu (⋮) in the top right corner' },
                  { step: '3', text: 'Tap "Add to Home Screen"' },
                  { step: '4', text: 'Tap "Add" to confirm' },
                  { step: '5', text: 'Open BotWave from your home screen' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green/20 border border-green/30 flex items-center justify-center font-mono text-xs text-green flex-shrink-0">
                      {item.step}
                    </span>
                    <p className="font-mono text-[10px] text-[#7abfa0] leading-relaxed pt-1">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {platform === 'ios' && (
            <motion.div
              key="ios"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h4 className="font-mono text-[10px] text-green tracking-[2px] mb-3">
                iPHONE - STEP BY STEP
              </h4>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Open this page in Safari (not Chrome)' },
                  { step: '2', text: 'Tap the Share button (square with arrow) at the bottom' },
                  { step: '3', text: 'Scroll down and tap "Add to Home Screen"' },
                  { step: '4', text: 'Tap "Add" in the top right corner' },
                  { step: '5', text: 'Open BotWave from your home screen' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green/20 border border-green/30 flex items-center justify-center font-mono text-xs text-green flex-shrink-0">
                      {item.step}
                    </span>
                    <p className="font-mono text-[10px] text-[#7abfa0] leading-relaxed pt-1">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {platform === 'desktop' && (
            <motion.div
              key="desktop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h4 className="font-mono text-[10px] text-green tracking-[2px] mb-3">
                DESKTOP - STEP BY STEP
              </h4>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Open this page in Chrome or Edge' },
                  { step: '2', text: 'Click the install icon in the address bar (or three dots menu → "Install BotWave")' },
                  { step: '3', text: 'Click "Install" to confirm' },
                  { step: '4', text: 'BotWave will open as a standalone app' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green/20 border border-green/30 flex items-center justify-center font-mono text-xs text-green flex-shrink-0">
                      {item.step}
                    </span>
                    <p className="font-mono text-[10px] text-[#7abfa0] leading-relaxed pt-1">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 mt-4">
          {['android', 'ios', 'desktop'].map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p as any)}
              className={`font-mono text-[10px] tracking-[2px] px-3 py-1 border transition-colors ${
                platform === p
                  ? 'border-green text-green bg-green/10'
                  : 'border-green/20 text-[#5a9a7a] hover:border-green/40'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-green/10">
        <button
          onClick={handleManualConfirm}
          className="w-full bg-green text-dark p-3 font-mono text-xs font-bold tracking-[2px] hover:bg-cyan transition-colors"
        >
          I HAVE INSTALLED THE APP - CONTINUE
        </button>
        <p className="font-mono text-[10px] text-[#3a6a5a] mt-2 text-center">
          Click above after you have added BotWave to your home screen
        </p>
      </div>
    </motion.div>
  );
}

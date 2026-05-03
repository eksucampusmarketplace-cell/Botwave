'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('BotWave SW registered:', registration.scope);
        })
        .catch((err) => {
          console.error('BotWave SW registration failed:', err);
        });
    }
  }, []);

  return null;
}

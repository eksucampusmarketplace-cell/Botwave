'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('BotWave SW registered:', registration.scope);

          // Request periodic background sync
          if ('periodicSync' in registration) {
            (registration as any).periodicSync
              .register('botwave-keepalive', { minInterval: 15 * 60 * 1000 })
              .catch(() => {
                // Periodic sync not supported or denied
              });
          }
        })
        .catch((err) => {
          console.error('BotWave SW registration failed:', err);
        });
    }
  }, []);

  return null;
}

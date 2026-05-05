'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { EventData, Step, Controls } from 'react-joyride';

const Joyride = dynamic(
  () => import('react-joyride').then((mod) => mod.Joyride),
  { ssr: false },
);

const TOUR_KEY = 'botwave_tour_completed';

const steps: Step[] = [
  {
    target: '[data-tour="sessions"]',
    content: 'This is where your WhatsApp sessions live. Each session connects one WhatsApp number to BotWave.',
    skipBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="add-session"]',
    content: 'Click here to connect a new WhatsApp number. You\'ll get a pairing code to link your device.',
    placement: 'top',
  },
  {
    target: '[data-tour="features"]',
    content: 'Toggle bot features on and off. Each feature adds new commands to your WhatsApp — stickers, AI chat, games, and more!',
    placement: 'top',
  },
  {
    target: '[data-tour="stats"]',
    content: 'Track your bot\'s activity: messages processed, commands run, and uptime percentage.',
    placement: 'top',
  },
  {
    target: '[data-tour="nav-sessions"]',
    content: 'Manage all your sessions in detail — connect, disconnect, or delete WhatsApp connections.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-settings"]',
    content: 'Configure your Groq AI key, anti-ban settings, and manage your account here.',
    placement: 'bottom',
  },
];

export default function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => setRun(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEvent = (data: EventData, _controls: Controls) => {
    if (data.type === 'tour:end') {
      setRun(false);
      localStorage.setItem(TOUR_KEY, 'true');
    }
  };

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      options={{
        backgroundColor: '#1a1a2e',
        textColor: '#e0e0e0',
        primaryColor: '#00ff88',
        overlayColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10000,
        showProgress: true,
      }}
      locale={{
        back: 'BACK',
        close: 'CLOSE',
        last: 'DONE',
        next: 'NEXT',
        skip: 'SKIP TOUR',
      }}
    />
  );
}

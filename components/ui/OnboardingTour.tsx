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
    content: 'Configure anti-ban settings, bot customization, and manage your account here.',
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
    const { status, action } = data;
    if (status === 'finished' || status === 'skipped' || action === 'close') {
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
        backgroundColor: '#16161f',
        textColor: '#e2e8f0',
        primaryColor: '#10b981',
        overlayColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 10000,
        showProgress: true,
        buttons: ['back', 'primary', 'skip', 'close'],
      }}
      styles={{
        tooltip: {
          borderRadius: '12px',
          border: '1px solid #1e293b',
          fontSize: '14px',
        },
        buttonPrimary: {
          backgroundColor: '#10b981',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 600,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#94a3b8',
          fontSize: '12px',
        },
        buttonSkip: {
          color: '#64748b',
          fontSize: '12px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}

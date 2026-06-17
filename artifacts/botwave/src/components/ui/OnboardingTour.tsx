

import { useState, useEffect } from 'react';


// eslint-disable-next-line
// dynamic removed
const Joyride: any = null;

const TOUR_KEY = 'botwave_tour_completed';

const steps = [
  {
    target: '[data-tour="sessions"]',
    content: 'This is where your Telegram bot sessions live. Each session connects one bot or account to BotWave.',
    disableBeacon: true,
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="add-session"]',
    content: 'Click here to connect a new Telegram bot or userbot. You\'ll need your @BotFather token.',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="features"]',
    content: 'Toggle bot features on and off. Each feature adds new commands to your Telegram group — stickers, AI chat, games, and more!',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="stats"]',
    content: 'Track your bot\'s activity: messages processed, commands run, and uptime percentage.',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="nav-sessions"]',
    content: 'Manage all your sessions in detail — connect, disconnect, or delete Telegram connections.',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="nav-settings"]',
    content: 'Configure rate limit protection, bot customization, and manage your account here.',
    placement: 'bottom' as const,
  },
];

export default function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      localStorage.setItem(TOUR_KEY, 'true');
      const timer = setTimeout(() => setRun(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      callback={(data: { status: string; action: string }) => {
        const { status, action } = data;
        if (status === 'finished' || status === 'skipped' || action === 'close') {
          setRun(false);
        }
      }}
      styles={{
        options: {
          backgroundColor: '#16161f',
          textColor: '#e2e8f0',
          primaryColor: '#10b981',
          overlayColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 10000,
        },
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

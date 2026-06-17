

/**
 * Joyride-based language onboarding for new users.
 *
 * Persists completion state in localStorage so it only shows once.
 */

import { useState, useCallback, useEffect } from 'react';

import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n';

const LANG_ONBOARDING_KEY = 'botwave_lang_onboarding_completed';

// Dynamic import to avoid SSR issues with Joyride
// eslint-disable-next-line
// dynamic removed
const Joyride: any = null;

const POPULAR_LANGS: { code: SupportedLocale; flag: string }[] = [
  { code: 'en', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { code: 'es', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
  { code: 'fr', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: 'ar', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
  { code: 'hi', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
  { code: 'pt', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
  { code: 'de', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
  { code: 'ru', flag: '\uD83C\uDDF7\uD83C\uDDFA' },
  { code: 'tr', flag: '\uD83C\uDDF9\uD83C\uDDF7' },
  { code: 'zh', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
  { code: 'ja', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
  { code: 'ko', flag: '\uD83C\uDDF0\uD83C\uDDF7' },
];

interface LanguageOnboardingProps {
  onLanguageSelect?: (locale: SupportedLocale) => void;
}

export default function LanguageOnboarding({ onLanguageSelect }: LanguageOnboardingProps) {
  const [run, setRun] = useState(false);
  const [selectedLang, setSelectedLang] = useState<SupportedLocale | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem(LANG_ONBOARDING_KEY);
    if (!completed) {
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleSelect = useCallback((code: SupportedLocale) => {
    setSelectedLang(code);
    onLanguageSelect?.(code);
    // Trigger Google Translate
    const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
    if (select) {
      select.value = code === 'zh' ? 'zh-CN' : code;
      select.dispatchEvent(new Event('change'));
    }
    window.dispatchEvent(new CustomEvent('botwave-lang-change', { detail: { locale: code } }));
    // Auto-close tour after selection and persist
    localStorage.setItem(LANG_ONBOARDING_KEY, 'true');
    setTimeout(() => setRun(false), 600);
  }, [onLanguageSelect]);

  if (!run) return null;

  const steps = [
    {
      target: 'body',
      placement: 'center' as const,
      disableBeacon: true,
      content: (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Welcome to BotWave!
          </h3>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
            Choose your preferred language to get started.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            maxWidth: '360px',
            margin: '0 auto',
          }}>
            {POPULAR_LANGS.map(({ code, flag }) => (
              <button
                key={code}
                onClick={() => handleSelect(code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: selectedLang === code ? '2px solid #6366f1' : '1px solid rgba(148,163,184,0.3)',
                  background: selectedLang === code ? 'rgba(99,102,241,0.1)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: selectedLang === code ? '#6366f1' : 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                <span>{flag}</span>
                <span>{SUPPORTED_LOCALES[code]}</span>
              </button>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={false}
      showSkipButton
      hideBackButton
      hideCloseButton={false}
      disableOverlayClose={false}
      disableScrolling
      callback={(data: { status: string }) => {
        const { status } = data;
        if (status === 'finished' || status === 'skipped') {
          setRun(false);
          localStorage.setItem(LANG_ONBOARDING_KEY, 'true');
        }
      }}
      styles={{
        options: {
          primaryColor: '#6366f1',
          zIndex: 10001,
          arrowColor: 'transparent',
        },
        tooltip: {
          borderRadius: '16px',
          padding: '24px',
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: '13px',
        },
        buttonNext: {
          background: '#6366f1',
          borderRadius: '8px',
          fontSize: '13px',
          padding: '8px 20px',
        },
      }}
      locale={{
        skip: 'Skip',
        close: 'Done',
        last: 'Done',
        next: 'Next',
      }}
    />
  );
}

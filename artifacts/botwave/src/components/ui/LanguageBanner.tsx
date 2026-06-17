

import { useState, useEffect } from 'react';

const LANG_MAP: Record<string, { name: string; native: string; gtCode: string }> = {
  fr: { name: 'French', native: 'Fran\u00e7ais', gtCode: 'fr' },
  yo: { name: 'Yoruba', native: '\u00c8d\u00e8 Yor\u00f9b\u00e1', gtCode: 'yo' },
  ha: { name: 'Hausa', native: 'Harshen Hausa', gtCode: 'ha' },
  ig: { name: 'Igbo', native: 'As\u1ee5s\u1ee5 Igbo', gtCode: 'ig' },
  hi: { name: 'Hindi', native: '\u0939\u093f\u0928\u094d\u0926\u0940', gtCode: 'hi' },
  zu: { name: 'Zulu', native: 'isiZulu', gtCode: 'zu' },
  af: { name: 'Afrikaans', native: 'Afrikaans', gtCode: 'af' },
  ar: { name: 'Arabic', native: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', gtCode: 'ar' },
  es: { name: 'Spanish', native: 'Espa\u00f1ol', gtCode: 'es' },
  pt: { name: 'Portuguese', native: 'Portugu\u00eas', gtCode: 'pt' },
  de: { name: 'German', native: 'Deutsch', gtCode: 'de' },
  sw: { name: 'Swahili', native: 'Kiswahili', gtCode: 'sw' },
  am: { name: 'Amharic', native: '\u12a0\u121b\u122d\u129b', gtCode: 'am' },
  zh: { name: 'Chinese', native: '\u4e2d\u6587', gtCode: 'zh-CN' },
  ja: { name: 'Japanese', native: '\u65e5\u672c\u8a9e', gtCode: 'ja' },
  ko: { name: 'Korean', native: '\ud55c\uad6d\uc5b4', gtCode: 'ko' },
  ru: { name: 'Russian', native: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', gtCode: 'ru' },
  tr: { name: 'Turkish', native: 'T\u00fcrk\u00e7e', gtCode: 'tr' },
};

const STORAGE_KEY = 'botwave_lang_banner_dismissed';

function getBrowserLang(): string | null {
  if (typeof navigator === 'undefined') return null;
  const raw = navigator.language || (navigator as any).userLanguage || '';
  const code = raw.split('-')[0].toLowerCase();
  if (code === 'en' || !LANG_MAP[code]) return null;
  return code;
}

function triggerGoogleTranslate(gtCode: string): void {
  const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (select) {
    select.value = gtCode;
    select.dispatchEvent(new Event('change'));
  }
}

export default function LanguageBanner() {
  const [lang, setLang] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const detected = getBrowserLang();
    if (detected) {
      setLang(detected);
      setVisible(true);
    }
  }, []);

  if (!visible || !lang) return null;

  const info = LANG_MAP[lang];

  const handleSwitch = () => {
    triggerGoogleTranslate(info.gtCode);
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        maxWidth: '420px',
        width: '90vw',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <span style={{ fontSize: '28px' }} aria-hidden="true">
        🌍
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', fontWeight: 500 }}>
          Prefer <strong>{info.native}</strong>?
        </p>
        <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '12px' }}>
          Switch this site to {info.name}
        </p>
      </div>
      <button
        onClick={handleSwitch}
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Switch
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          color: '#64748b',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
}

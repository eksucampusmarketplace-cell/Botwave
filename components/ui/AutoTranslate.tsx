'use client';

import { useState, useEffect, useCallback } from 'react';

interface AutoTranslateProps {
  text: string;
  sourceLang?: string;
  className?: string;
  as?: 'p' | 'span' | 'div';
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', fr: 'French', yo: 'Yoruba', ha: 'Hausa', ig: 'Igbo',
  hi: 'Hindi', ar: 'Arabic', es: 'Spanish', pt: 'Portuguese', de: 'German',
  sw: 'Swahili', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ru: 'Russian',
  tr: 'Turkish', af: 'Afrikaans', zu: 'Zulu', am: 'Amharic', pcm: 'Nigerian Pidgin',
};

const STORAGE_KEY = 'botwave_preferred_lang';

function getPreferredLang(): string {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && LANG_NAMES[saved]) return saved;
  const raw = navigator.language?.split('-')[0]?.toLowerCase() || 'en';
  return LANG_NAMES[raw] ? raw : 'en';
}

export function setPreferredLang(lang: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

export default function AutoTranslate({
  text,
  sourceLang = 'en',
  className = '',
  as: Tag = 'span',
}: AutoTranslateProps) {
  const [translated, setTranslated] = useState<string>(text);
  const [isTranslated, setIsTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [targetLang, setTargetLang] = useState('en');

  const translate = useCallback(async (lang: string) => {
    if (lang === sourceLang || !text) {
      setTranslated(text);
      setIsTranslated(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang: lang, sourceLang }),
      });
      const data = await res.json();
      if (data.translated) {
        setTranslated(data.translated);
        setIsTranslated(true);
      }
    } catch {
      // Keep original text on error
    } finally {
      setLoading(false);
    }
  }, [text, sourceLang]);

  useEffect(() => {
    const lang = getPreferredLang();
    setTargetLang(lang);
    if (lang !== sourceLang) {
      translate(lang);
    }
  }, [sourceLang, translate]);

  return (
    <Tag className={className}>
      {loading ? (
        <span className="opacity-60">{text}</span>
      ) : (
        <>
          {translated}
          {isTranslated && (
            <span className="text-xs text-gray-500 ml-1">
              (translated from {LANG_NAMES[sourceLang] || sourceLang})
            </span>
          )}
        </>
      )}
    </Tag>
  );
}

/**
 * Language selector dropdown for users to pick their preferred language.
 */
export function LanguageSelector({ className = '' }: { className?: string }) {
  const [current, setCurrent] = useState('en');

  useEffect(() => {
    setCurrent(getPreferredLang());
  }, []);

  const handleChange = (lang: string) => {
    setCurrent(lang);
    setPreferredLang(lang);
    window.location.reload();
  };

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className={`bg-gray-800 text-gray-300 text-sm rounded-lg px-2 py-1 border border-gray-700 ${className}`}
      aria-label="Select language"
    >
      {Object.entries(LANG_NAMES).map(([code, name]) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  );
}

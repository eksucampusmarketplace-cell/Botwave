/**
 * SEO hreflang tags for multilingual content.
 * Tells search engines about translated versions of the page.
 */

const SUPPORTED_LANGS = [
  'en', 'fr', 'yo', 'ha', 'ig', 'hi', 'ar', 'es', 'pt', 'de',
  'sw', 'zh', 'ja', 'ko', 'ru', 'tr', 'af', 'zu', 'am',
];

interface HrefLangTagsProps {
  baseUrl?: string;
  path: string;
}

export default function HrefLangTags({
  baseUrl = 'https://www.botwave.online',
  path,
}: HrefLangTagsProps) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return (
    <>
      {SUPPORTED_LANGS.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${baseUrl}${cleanPath}?lang=${lang}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${baseUrl}${cleanPath}`}
      />
    </>
  );
}

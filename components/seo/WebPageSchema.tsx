/**
 * WebPage JSON-LD schema. Used for legal/info pages (privacy, terms,
 * security, about) where Article or SoftwareApplication is wrong but we
 * still want structured page metadata.
 */
interface WebPageSchemaProps {
  url: string;
  name: string;
  description: string;
  datePublished?: string;
  dateModified?: string;
  inLanguage?: string;
  isPartOf?: { name: string; url: string };
}

export default function WebPageSchema({
  url,
  name,
  description,
  datePublished,
  dateModified,
  inLanguage = 'en',
  isPartOf = { name: 'BotWave', url: 'https://www.botwave.online' },
}: WebPageSchemaProps) {
  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url,
    name,
    description,
    inLanguage,
    isPartOf: {
      '@type': 'WebSite',
      name: isPartOf.name,
      url: isPartOf.url,
    },
    publisher: {
      '@type': 'Organization',
      name: 'BotWave',
      url: 'https://www.botwave.online',
    },
  };
  if (datePublished) json.datePublished = datePublished;
  if (dateModified) json.dateModified = dateModified;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

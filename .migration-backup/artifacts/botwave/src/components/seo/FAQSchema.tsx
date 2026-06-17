/**
 * FAQPage JSON-LD schema. Drop a list of {question, answer} pairs into this
 * component and Google / Bing / Perplexity / ChatGPT will all surface the
 * Q&A pairs in their answer boxes.
 *
 * Use cases:
 *   - On /how-to/[slug], /fix/[slug], /compare/[slug], /use-cases/[slug],
 *     blog posts, /privacy, /terms.
 *
 * Why this is high-leverage for AI engines:
 *   Perplexity, ChatGPT Search and Brave Leo specifically look for FAQPage
 *   schema to extract answer-ready snippets. Without schema they have to
 *   guess where the Q&A boundaries are.
 */
export interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQSchema({ items }: { items: FAQItem[] }) {
  if (!items || items.length === 0) return null;
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

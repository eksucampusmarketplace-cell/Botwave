/**
 * HowTo JSON-LD schema. Tells Google / Bing / AI engines that this page is a
 * step-by-step tutorial with discrete steps, prerequisites, and an estimated
 * completion time.
 *
 * Google previously displayed HowTo as a rich result; even though that visual
 * treatment is being phased out for non-AMP results, the schema is still used
 * by Bing and by every AI answer engine that ingests structured data
 * (Perplexity, ChatGPT Search, You.com, Brave Leo, Claude).
 */
export interface HowToStep {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

interface HowToSchemaProps {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601 duration, e.g. "PT2M" for 2 minutes
  estimatedCost?: { currency: string; value: string };
  supply?: string[];
  tool?: string[];
  steps: HowToStep[];
  url: string;
}

export default function HowToSchema({
  name,
  description,
  totalTime,
  estimatedCost,
  supply,
  tool,
  steps,
  url,
}: HowToSchemaProps) {
  if (!steps || steps.length === 0) return null;
  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    url,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : {}),
      ...(s.image ? { image: s.image } : {}),
    })),
  };
  if (totalTime) json.totalTime = totalTime;
  if (estimatedCost) {
    json.estimatedCost = {
      '@type': 'MonetaryAmount',
      currency: estimatedCost.currency,
      value: estimatedCost.value,
    };
  }
  if (supply) json.supply = supply.map((s) => ({ '@type': 'HowToSupply', name: s }));
  if (tool) json.tool = tool.map((t) => ({ '@type': 'HowToTool', name: t }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

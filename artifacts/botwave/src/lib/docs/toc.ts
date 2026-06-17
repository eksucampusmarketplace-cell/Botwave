import type { TocHeading } from '@/components/docs/DocToc';

/**
 * Convert text to a kebab-case slug — must match the `id` that
 * `rehype-slug` generates client-side so the ToC anchors line up.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Extract H2/H3 headings from a markdown string so we can render a
 * Table of Contents alongside the doc. We skip inside fenced code
 * blocks so a `## ` inside a code sample doesn't pollute the ToC.
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const lines = markdown.split('\n');
  const out: TocHeading[] = [];
  let inFence = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const text = h2[1].trim();
      out.push({ id: slugifyHeading(text), text, depth: 2 });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const text = h3[1].trim();
      out.push({ id: slugifyHeading(text), text, depth: 3 });
    }
  }

  return out;
}

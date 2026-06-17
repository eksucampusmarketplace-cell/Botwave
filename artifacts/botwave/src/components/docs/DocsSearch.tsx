

import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import type { DocPage } from '@/lib/docs/data';

interface DocsSearchProps {
  docs: Pick<DocPage, 'slug' | 'title' | 'description' | 'category'>[];
}

export default function DocsSearch({ docs }: DocsSearchProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return docs
      .map((d) => {
        const hay = `${d.title} ${d.description} ${d.category}`.toLowerCase();
        let score = 0;
        if (d.title.toLowerCase().includes(q)) score += 3;
        if (d.category.toLowerCase().includes(q)) score += 2;
        if (hay.includes(q)) score += 1;
        return { doc: d, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [query, docs]);

  return (
    <div className="relative mb-10">
      <label htmlFor="docs-search" className="sr-only">
        Search docs
      </label>
      <input
        id="docs-search"
        type="search"
        autoComplete="off"
        placeholder="Search docs…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-alt)] px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-blue-400"
      />
      {query.trim().length > 0 && (
        <div className="absolute left-0 right-0 z-10 mt-2 max-h-96 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card-bg,var(--surface))] shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--text-muted)]">
              No matches. Try a different word, or{' '}
              <Link href="/faq" className="text-blue-500 hover:underline">
                browse the FAQ
              </Link>
              .
            </p>
          ) : (
            <ul>
              {results.map(({ doc }) => (
                <li key={doc.slug} className="border-b border-[var(--border)] last:border-b-0">
                  <Link
                    href={`/docs/${doc.slug}`}
                    className="block px-4 py-3 hover:bg-[var(--bg-alt)]"
                    onClick={() => setQuery('')}
                  >
                    <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {doc.category}
                    </span>
                    <span className="block font-semibold text-[var(--text-primary)]">
                      {doc.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-secondary)] line-clamp-1">
                      {doc.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

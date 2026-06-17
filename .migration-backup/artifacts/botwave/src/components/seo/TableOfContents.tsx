

/**
 * Lightweight Table of Contents. Parses a list of {id, label, level} entries
 * and renders an anchor list. Used on long content pages (blog posts, how-to,
 * fix, compare) for both UX and SEO signals.
 *
 * Why this helps indexing:
 *   - Adds explicit named anchors that AI engines extract as section
 *     boundaries when summarising.
 *   - Improves time-on-page (engagement signal) by helping users jump.
 *   - Gives Googlebot a clear outline of the page structure.
 */
export interface TocEntry {
  id: string;
  label: string;
  level?: 2 | 3;
}

interface TableOfContentsProps {
  entries: TocEntry[];
  title?: string;
}

export default function TableOfContents({
  entries,
  title = 'On this page',
}: TableOfContentsProps) {
  if (!entries || entries.length === 0) return null;
  return (
    <nav
      aria-label="Table of contents"
      className="my-8 p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)]"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
        {title}
      </h2>
      <ol className="space-y-1.5 list-none">
        {entries.map((e) => (
          <li
            key={e.id}
            className={e.level === 3 ? 'ml-4 text-sm' : 'text-sm font-medium'}
          >
            <a
              href={`#${e.id}`}
              className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              {e.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

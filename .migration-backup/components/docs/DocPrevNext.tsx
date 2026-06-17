import Link from 'next/link';
import type { DocPage } from '@/lib/docs/data';

interface DocPrevNextProps {
  prev?: DocPage;
  next?: DocPage;
}

export default function DocPrevNext({ prev, next }: DocPrevNextProps) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-12 grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/docs/${prev.slug}`}
          className="group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card-bg,var(--surface))] px-5 py-4 transition-colors hover:border-blue-400"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            ← Previous
          </span>
          <span className="mt-1 font-semibold text-[var(--text-primary)] group-hover:text-blue-500">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card-bg,var(--surface))] px-5 py-4 text-right transition-colors hover:border-blue-400"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Next →
          </span>
          <span className="mt-1 font-semibold text-[var(--text-primary)] group-hover:text-blue-500">
            {next.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

import Link from 'next/link';
import { docPages, getAllDocCategories } from '@/lib/docs/data';

interface DocSidebarProps {
  activeSlug?: string;
}

export default function DocSidebar({ activeSlug }: DocSidebarProps) {
  const categories = getAllDocCategories();

  return (
    <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-4">
      <Link
        href="/docs"
        className={`mb-4 block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
          !activeSlug
            ? 'bg-blue-500/10 text-blue-500'
            : 'text-[var(--text-primary)] hover:bg-[var(--bg-alt)]'
        }`}
      >
        Documentation Home
      </Link>

      <nav aria-label="Documentation">
        {categories.map((category) => {
          const docs = docPages.filter((d) => d.category === category);
          return (
            <div key={category} className="mb-5">
              <h3 className="mb-1.5 px-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {category}
              </h3>
              <ul className="space-y-0.5">
                {docs.map((doc) => {
                  const isActive = doc.slug === activeSlug;
                  return (
                    <li key={doc.slug}>
                      <Link
                        href={`/docs/${doc.slug}`}
                        className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-500/10 font-medium text-blue-500'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-alt)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {doc.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

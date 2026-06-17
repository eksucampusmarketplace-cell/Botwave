

import { useEffect, useState } from 'react';

export interface TocHeading {
  id: string;
  text: string;
  depth: number;
}

interface DocTocProps {
  headings: TocHeading[];
}

export default function DocToc({ headings }: DocTocProps) {
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);
        if (visible[0]) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '0px 0px -75% 0px', threshold: 0 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden xl:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pl-2">
      <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        On this page
      </p>
      <ul className="space-y-1 text-sm">
        {headings.map((h) => {
          const isActive = active === h.id;
          return (
            <li key={h.id} style={{ paddingLeft: `${(h.depth - 2) * 12}px` }}>
              <a
                href={`#${h.id}`}
                className={`block rounded px-2 py-1 transition-colors ${
                  isActive
                    ? 'text-blue-500 font-medium border-l-2 border-blue-500 -ml-0.5 pl-1.5'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

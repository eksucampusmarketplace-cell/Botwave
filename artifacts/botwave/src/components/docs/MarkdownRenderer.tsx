

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = String(children ?? '').replace(/\n$/, '');
  const lang = (className || '').replace('language-', '') || 'text';

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore — clipboard might be blocked
    }
  };

  return (
    <div className="not-prose group relative my-4 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-alt)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-muted)]">
        <span className="font-mono uppercase tracking-wide">{lang}</span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Copy code"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-[var(--text-primary)]">
        <code className={className}>{text}</code>
      </pre>
    </div>
  );
}

const ALERT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/;

const ALERT_META: Record<string, { label: string; cls: string; icon: string }> = {
  NOTE:      { label: 'Note',      cls: 'border-blue-500/30 bg-blue-500/10 text-blue-500',         icon: 'i' },
  TIP:       { label: 'Tip',       cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500', icon: '★' },
  IMPORTANT: { label: 'Important', cls: 'border-violet-500/30 bg-violet-500/10 text-violet-500',   icon: '!' },
  WARNING:   { label: 'Warning',   cls: 'border-amber-500/30 bg-amber-500/10 text-amber-500',      icon: '!' },
  CAUTION:   { label: 'Caution',   cls: 'border-red-500/30 bg-red-500/10 text-red-500',            icon: '!' },
};

function extractAlertFromChildren(children: React.ReactNode): { kind: string | null; rest: React.ReactNode } {
  const arr = Array.isArray(children) ? [...children] : [children];

  for (let i = 0; i < arr.length; i++) {
    const node = arr[i] as { type?: unknown; props?: { children?: React.ReactNode } };
    if (node && typeof node === 'object' && 'type' in node && node.type === 'p' && node.props) {
      const pKids = Array.isArray(node.props.children) ? [...node.props.children] : [node.props.children];
      const first = pKids[0];
      if (typeof first === 'string') {
        const m = first.match(ALERT_RE);
        if (m) {
          const remaining = first.replace(ALERT_RE, '');
          if (remaining) pKids[0] = remaining;
          else pKids.shift();
          arr[i] = { ...node, props: { ...node.props, children: pKids } } as typeof node;
          return { kind: m[1], rest: arr };
        }
      }
      return { kind: null, rest: children };
    }
  }
  return { kind: null, rest: children };
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article
      className="prose prose-lg max-w-none
        prose-headings:scroll-mt-24
        prose-headings:text-[var(--text-primary)] prose-headings:font-bold
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed
        prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-[var(--text-primary)]
        prose-code:text-blue-500 prose-code:bg-[var(--bg-alt)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-li:text-[var(--text-secondary)] prose-li:my-1
        prose-ol:text-[var(--text-secondary)]
        prose-ul:text-[var(--text-secondary)]
        prose-table:text-sm prose-th:text-left prose-th:text-[var(--text-primary)] prose-td:text-[var(--text-secondary)]
        prose-blockquote:border-l-blue-500 prose-blockquote:text-[var(--text-secondary)] prose-blockquote:not-italic
        prose-hr:border-[var(--border)]
        prose-img:rounded-lg
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            { behavior: 'wrap', properties: { className: 'no-underline hover:underline' } },
          ],
        ]}
        components={{
          a: ({ href, children, ...props }) => {
            const isExternal = !!href && /^https?:\/\//.test(href) && !href.includes('botwave.online');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
          pre: ({ children }) => {
            // react-markdown wraps fenced code in <pre><code>...; unwrap so our CodeBlock renders the chrome
            const child = Array.isArray(children) ? children[0] : children;
            if (child && typeof child === 'object' && 'props' in child) {
              const c = child as { props?: { className?: string; children?: React.ReactNode } };
              return <CodeBlock className={c.props?.className}>{c.props?.children}</CodeBlock>;
            }
            return <pre>{children}</pre>;
          },
          code: ({ className, children, ...props }) => {
            // Inline code only — fenced blocks are handled in `pre` above
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => {
            const { kind, rest } = extractAlertFromChildren(children);
            if (kind && ALERT_META[kind]) {
              const meta = ALERT_META[kind];
              return (
                <aside className={`not-prose my-5 rounded-xl border-l-4 px-4 py-3 ${meta.cls}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                    <span aria-hidden>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </div>
                  <div className="text-sm leading-relaxed text-[var(--text-secondary)] [&>p]:my-1 [&>p:last-child]:mb-0">
                    {rest}
                  </div>
                </aside>
              );
            }
            return <blockquote>{children}</blockquote>;
          },
          table: ({ children }) => (
            <div className="not-prose my-4 overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-[var(--border)] bg-[var(--bg-alt)] px-3 py-2 text-left font-semibold text-[var(--text-primary)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[var(--border)] px-3 py-2 align-top text-[var(--text-secondary)]">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

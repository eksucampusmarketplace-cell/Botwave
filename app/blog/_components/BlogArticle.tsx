'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface RelatedPost {
  slug: string;
  title: string;
}

interface BlogArticleProps {
  content: string;
  date: string;
  readTime: string;
  slug: string;
  relatedPosts?: RelatedPost[];
}

function renderMarkdown(md: string) {
  const lines = md.trim().split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let inTable = false;
  let tableRows: string[][] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const parseInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Links
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      // Inline code
      const codeMatch = remaining.match(/`([^`]+)`/);

      const matches = [
        boldMatch ? { type: 'bold', index: boldMatch.index!, match: boldMatch } : null,
        linkMatch ? { type: 'link', index: linkMatch.index!, match: linkMatch } : null,
        codeMatch ? { type: 'code', index: codeMatch.index!, match: codeMatch } : null,
      ].filter(Boolean).sort((a, b) => a!.index - b!.index);

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      const first = matches[0]!;
      if (first.index > 0) {
        parts.push(remaining.slice(0, first.index));
      }

      if (first.type === 'bold') {
        parts.push(<strong key={key++} className="text-[var(--text-primary)] font-semibold">{first.match[1]}</strong>);
        remaining = remaining.slice(first.index + first.match[0].length);
      } else if (first.type === 'link') {
        const href = first.match[2];
        const isExternal = href.startsWith('http');
        parts.push(
          <Link key={key++} href={href} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2" {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {first.match[1]}
          </Link>
        );
        remaining = remaining.slice(first.index + first.match[0].length);
      } else if (first.type === 'code') {
        parts.push(<code key={key++} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-sm font-mono text-emerald-300">{first.match[1]}</code>);
        remaining = remaining.slice(first.index + first.match[0].length);
      }
    }

    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
  };

  const flushTable = () => {
    if (tableRows.length < 2) return;
    const headers = tableRows[0];
    const rows = tableRows.slice(2); // skip separator row
    elements.push(
      <div key={`table-${i}`} className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {headers.map((h, j) => (
                <th key={j} className="text-left p-3 bg-white/5 border border-white/10 text-[var(--text-primary)] font-semibold text-xs uppercase tracking-wide">
                  {parseInline(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="p-3 border border-white/10 text-slate-400">
                    {parseInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="my-4 p-4 bg-[#0d1117] border border-white/10 rounded-lg overflow-x-auto">
            <code className="text-sm text-slate-300 font-mono">{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        if (inTable) flushTable();
        inCodeBlock = true;
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // Table rows
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) inTable = true;
      const cells = line.split('|').slice(1, -1);
      tableRows.push(cells);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-4 mt-8">{parseInline(line.slice(2))}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-2xl font-bold text-[var(--text-primary)] mb-3 mt-10">{parseInline(line.slice(3))}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-xl font-bold text-[var(--text-primary)] mb-2 mt-8">{parseInline(line.slice(4))}</h3>);
    }
    // List items
    else if (line.startsWith('- ')) {
      const items: React.ReactNode[] = [];
      let j = i;
      while (j < lines.length && lines[j].startsWith('- ')) {
        items.push(<li key={j} className="flex items-start gap-2"><span className="text-emerald-400 mt-1 flex-shrink-0">•</span><span>{parseInline(lines[j].slice(2))}</span></li>);
        j++;
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-2 my-4 text-slate-400">{items}</ul>);
      i = j;
      continue;
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      let j = i;
      while (j < lines.length && /^\d+\.\s/.test(lines[j])) {
        const text = lines[j].replace(/^\d+\.\s/, '');
        items.push(<li key={j}>{parseInline(text)}</li>);
        j++;
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-2 my-4 text-slate-400">{items}</ol>);
      i = j;
      continue;
    }
    // Regular paragraph
    else {
      elements.push(<p key={i} className="text-slate-400 leading-relaxed my-4">{parseInline(line)}</p>);
    }

    i++;
  }

  if (inTable) flushTable();

  return elements;
}

function ShareButtons({ slug }: { slug: string }) {
  const url = `https://www.botwave.online/blog/${slug}`;
  const text = 'Check out this article on BotWave!';

  return (
    <div className="flex items-center gap-3 my-6">
      <span className="text-xs text-slate-500 font-mono">Share:</span>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
        aria-label="Share on WhatsApp"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-colors"
        aria-label="Share on Twitter"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors"
        aria-label="Share on Facebook"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
    </div>
  );
}

export default function BlogArticle({ content, date, readTime, slug, relatedPosts }: BlogArticleProps) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : '';
  const wordCount = content.split(/\s+/).length;
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    datePublished: date,
    dateModified: date,
    author: { '@type': 'Organization', name: 'BotWave', url: 'https://www.botwave.online' },
    publisher: { '@type': 'Organization', name: 'BotWave', url: 'https://www.botwave.online' },
    url: `https://www.botwave.online/blog/${slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.botwave.online/blog/${slug}` },
    wordCount,
    inLanguage: 'en',
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <Navbar />

      <article className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/blog" className="text-sm text-emerald-400 hover:text-emerald-300 mb-8 inline-block">
              ← Back to Blog
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-slate-500 font-mono">{date}</span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-500 font-mono">{readTime}</span>
            </div>

            <ShareButtons slug={slug} />

            <div className="prose-custom">
              {renderMarkdown(content)}
            </div>

            <hr className="border-[var(--border)] my-12" />

            {relatedPosts && relatedPosts.length > 0 && (
              <div className="glass-card rounded-xl p-8 mb-8">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Related Articles</h3>
                <ul className="space-y-3">
                  {relatedPosts.map((post) => (
                    <li key={post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
                      >
                        {post.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="glass-card rounded-xl p-8 text-center">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">Ready to try BotWave?</h3>
              <p className="text-slate-400 mb-6">Set up your free WhatsApp bot in under 2 minutes. No coding needed.</p>
              <Link
                href="/signup"
                className="inline-block px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20"
              >
                Get Started Free →
              </Link>
            </div>
          </motion.div>
        </div>
      </article>
      <Footer />
    </main>
  );
}

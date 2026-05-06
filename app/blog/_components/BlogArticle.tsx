'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';

interface BlogArticleProps {
  content: string;
  date: string;
  readTime: string;
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

export default function BlogArticle({ content, date, readTime }: BlogArticleProps) {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
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

            <div className="flex items-center gap-3 mb-8">
              <span className="text-xs text-slate-500 font-mono">{date}</span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-500 font-mono">{readTime}</span>
            </div>

            <div className="prose-custom">
              {renderMarkdown(content)}
            </div>

            <hr className="border-[var(--border)] my-12" />

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
    </main>
  );
}

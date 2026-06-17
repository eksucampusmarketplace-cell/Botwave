import { useParams } from 'wouter';
import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { docPages } from '@/lib/docs/data';

function renderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-2xl font-bold text-[var(--text-primary)] mt-10 mb-4">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('#### ')) {
      elements.push(<h4 key={i} className="font-semibold text-[var(--text-primary)] mt-4 mb-1">{line.slice(5)}</h4>);
    } else if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="my-4 p-4 rounded-xl bg-[var(--bg-alt)] border border-[var(--border)] overflow-x-auto text-sm font-mono text-blue-400">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="my-3 space-y-1.5 pl-4">
          {items.map((item, j) => (
            <li key={j} className="text-[var(--text-secondary)] text-sm flex items-start gap-2">
              <span className="text-blue-500 shrink-0 mt-1">·</span>
              <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>') }} />
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      elements.push(
        <ol key={i} className="my-3 space-y-1.5 pl-4 list-decimal list-inside">
          {items.map((item, j) => (
            <li key={j} className="text-[var(--text-secondary)] text-sm"
              dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>') }} />
          ))}
        </ol>
      );
      continue;
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="my-4 pl-4 border-l-4 border-blue-500/40 text-[var(--text-muted)] italic text-sm">
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={i} className="font-bold text-[var(--text-primary)] mt-4 mb-1">{line.slice(2, -2)}</p>);
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)]">$1</strong>').replace(/`(.+?)`/g, '<code class="bg-[var(--bg-alt)] px-1 rounded text-blue-400 font-mono text-xs">$1</code>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>') }} />
      );
    }
    i++;
  }
  return elements;
}

const platformColors: Record<string, string> = {
  all: 'bg-blue-500/10 text-blue-500',
  whatsapp: 'bg-green-600/10 text-green-600',
  telegram: 'bg-blue-500/10 text-blue-500',
  userbot: 'bg-violet-600/10 text-violet-600',
};

const platformLabels: Record<string, string> = {
  all: 'All Platforms',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram Bot',
  userbot: 'Userbot',
};

export default function DocsDetailPage() {
  const params = useParams<{ slug: string }>();
  const doc = docPages.find(d => d.slug === params.slug);

  if (!doc) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="pt-32 pb-20 px-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Doc not found</h1>
          <Link href="/docs" className="text-blue-500 hover:underline">← Back to docs</Link>
        </div>
        <Footer />
      </main>
    );
  }

  const related = docPages.filter(d => doc.relatedDocs.includes(d.slug));

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/docs" className="hover:text-[var(--primary)]">Docs</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{doc.title}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${platformColors[doc.platform]}`}>
              {platformLabels[doc.platform]}
            </span>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-alt)] px-2 py-0.5 rounded-full">{doc.category}</span>
            {doc.lastUpdated && (
              <span className="text-xs text-[var(--text-muted)]">Updated {new Date(doc.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] mb-3">{doc.title}</h1>
          <p className="text-lg text-[var(--text-secondary)] mb-10">{doc.description}</p>

          <div className="prose-like">
            {renderMarkdown(doc.content)}
          </div>

          {related.length > 0 && (
            <div className="mt-16 pt-8 border-t border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)] mb-4">Related Docs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map(r => (
                  <Link
                    key={r.slug}
                    href={`/docs/${r.slug}`}
                    className="group block p-4 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-blue-400/50 transition-colors"
                  >
                    <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-500 text-sm transition-colors">{r.title}</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{r.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between pt-6 border-t border-[var(--border)]">
            <Link href="/docs" className="text-sm text-blue-500 hover:underline">← All docs</Link>
            <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Try BotWave Free →
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

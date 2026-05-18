import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { userbotCommands, getCommandBySlug, getCommandsByCategory } from '@/lib/commands/data';

export function generateStaticParams() {
  return userbotCommands.map(cmd => ({ slug: cmd.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const cmd = getCommandBySlug('userbot', params.slug);
  if (!cmd) return {};
  return {
    title: cmd.seoTitle,
    description: cmd.seoDescription,
    keywords: cmd.seoKeywords,
    openGraph: {
      title: cmd.seoTitle,
      description: cmd.seoDescription,
      url: `https://www.botwave.online/commands/userbot/${cmd.slug}`,
      type: 'article',
    },
    alternates: { canonical: `/commands/userbot/${cmd.slug}` },
  };
}

export default function UserbotCommandPage({ params }: { params: { slug: string } }) {
  const cmd = getCommandBySlug('userbot', params.slug);
  if (!cmd) notFound();

  const related = cmd.relatedCommands
    .map(name => userbotCommands.find(c => c.name === name || c.slug === name))
    .filter(Boolean);

  const sameCat = getCommandsByCategory('userbot', cmd.category)
    .filter(c => c.slug !== cmd.slug)
    .slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to use ${cmd.prefix}${cmd.name} on Telegram Userbot`,
    description: cmd.description,
    step: cmd.examples.map((ex, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: ex,
    })),
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <Link href="/commands" className="hover:text-[var(--primary)]">Commands</Link>
            <span>/</span>
            <Link href="/commands/userbot" className="hover:text-[var(--primary)]">Userbot</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{cmd.prefix}{cmd.name}</span>
          </nav>

          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1.5 bg-violet-600/10 border border-violet-600/20 rounded-lg text-violet-600 text-xs font-semibold">Telegram Userbot</span>
            <span className="px-3 py-1.5 bg-[var(--bg-alt)] border border-[var(--border)] rounded-lg text-[var(--text-muted)] text-xs font-medium">{cmd.category}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-4">
            <code className="text-violet-600">{cmd.prefix}{cmd.name}</code>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-10">{cmd.description}</p>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Syntax</h2>
            <div className="bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl p-5">
              <code className="text-[var(--text-primary)] font-mono text-lg">{cmd.syntax}</code>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Examples</h2>
            <div className="space-y-3">
              {cmd.examples.map((ex, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-[var(--bg-alt)] border border-[var(--border)] rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <code className="text-[var(--text-primary)] text-sm">{ex}</code>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Permissions</h2>
            <p className="text-[var(--text-secondary)]">{cmd.permissions}</p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Use Cases</h2>
            <ul className="space-y-2">
              {cmd.useCases.map((uc, i) => (
                <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                  {uc}
                </li>
              ))}
            </ul>
          </section>

          {(related.length > 0 || sameCat.length > 0) && (
            <section className="mb-10">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Related Commands</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...related, ...sameCat].slice(0, 6).map(rc => rc && (
                  <Link key={rc.slug} href={`/commands/userbot/${rc.slug}`} className="p-4 bg-[var(--card-bg,var(--surface))] border border-[var(--border)] rounded-xl hover:border-violet-400 transition-colors">
                    <code className="text-violet-600 font-mono font-bold">{rc.prefix}{rc.name}</code>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">{rc.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="mt-12 p-8 bg-gradient-to-r from-violet-600/10 to-blue-500/10 border border-violet-600/20 rounded-2xl text-center">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Try {cmd.prefix}{cmd.name} now</h3>
            <p className="text-[var(--text-secondary)] mb-4">Connect your Telegram account via API credentials. Takes under 2 minutes.</p>
            <Link href="/signup" className="inline-flex px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

import { Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const searchEngines = [
  { name: 'Google', audience: 'Mainstream search', indexSource: 'Googlebot', searchUrl: 'https://www.google.com/search?q=botwave+telegram+bot', status: 'indexed' },
  { name: 'Bing', audience: 'Microsoft / Windows users', indexSource: 'Bingbot', searchUrl: 'https://www.bing.com/search?q=botwave+telegram+bot', status: 'indexed' },
  { name: 'DuckDuckGo', audience: 'Privacy-focused users', indexSource: 'Bing index', searchUrl: 'https://duckduckgo.com/?q=botwave+telegram+bot', status: 'indexed' },
  { name: 'Yahoo', audience: 'Yahoo ecosystem', indexSource: 'Bing index', searchUrl: 'https://search.yahoo.com/search?p=botwave+telegram+bot', status: 'indexed' },
  { name: 'Perplexity', audience: 'AI answer engine users', indexSource: 'Bing + web crawl', searchUrl: 'https://www.perplexity.ai/search?q=botwave+telegram+bot', status: 'cited' },
  { name: 'ChatGPT Search', audience: 'OpenAI users', indexSource: 'Bing index', searchUrl: 'https://chatgpt.com/?q=botwave', status: 'cited' },
  { name: 'You.com', audience: 'AI-enhanced search', indexSource: 'Own crawl + partners', searchUrl: 'https://you.com/search?q=botwave+telegram+bot', status: 'indexed' },
  { name: 'Ecosia', audience: 'Green / eco-conscious', indexSource: 'Bing index', searchUrl: 'https://www.ecosia.org/search?q=botwave+telegram+bot', status: 'indexed' },
];

const statusStyles: Record<string, string> = {
  indexed: 'bg-emerald-500/10 text-emerald-500',
  cited: 'bg-blue-500/10 text-blue-500',
  pending: 'bg-yellow-500/10 text-yellow-600',
};

export default function SearchEnginesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
            <Link href="/" className="hover:text-[var(--primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Search Engines</span>
          </nav>

          <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-4">BotWave on Search Engines</h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mb-10">
            How BotWave appears across traditional search engines and AI-powered answer engines. Click any row to search for BotWave on that platform.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="pb-3 font-medium">Engine</th>
                  <th className="pb-3 font-medium">Audience</th>
                  <th className="pb-3 font-medium">Index Source</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {searchEngines.map(e => (
                  <tr key={e.name} className="border-b border-[var(--border)] hover:bg-[var(--card-bg,var(--surface))] transition-colors">
                    <td className="py-4 pr-4">
                      <a
                        href={e.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-500 hover:underline"
                      >
                        {e.name} →
                      </a>
                    </td>
                    <td className="py-4 pr-4 text-[var(--text-secondary)]">{e.audience}</td>
                    <td className="py-4 pr-4 text-[var(--text-muted)]">{e.indexSource}</td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[e.status]}`}>
                        {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

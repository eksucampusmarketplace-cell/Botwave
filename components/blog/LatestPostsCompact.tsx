import Link from 'next/link';
import { recentBlogPosts } from '@/lib/blog/recent';

/**
 * Compact "Latest from the blog" strip designed to drop in below the
 * fold on landing pages.
 *
 * Why this exists:
 *   When new blog posts ship, every page that renders this component
 *   gets a real HTML diff (new cards swap in, dates advance). That
 *   keeps search engines' freshness signals honest: the sitemap
 *   <lastmod> bumps on those pages match an actual change in rendered
 *   HTML, not just a moved timestamp.
 *
 *   Bonus: it also gives the long-tail landing pages internal links
 *   back to high-intent content, which is a documented crawl-budget
 *   booster.
 *
 * Pass `limit` to control how many posts render (default 4).
 */
export default function LatestPostsCompact({ limit = 4, heading = 'Latest from the blog' }: { limit?: number; heading?: string }) {
  const posts = recentBlogPosts.slice(0, limit);
  if (posts.length === 0) return null;

  return (
    <section className="pb-16 px-6" data-testid="latest-posts-compact">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{heading}</h2>
          <Link
            href="/blog"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            All posts →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {posts.map((post) => {
            const published = new Date(post.publishedAt);
            const label = published.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            });
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block p-5 rounded-xl bg-[var(--card-bg,var(--surface))] border border-[var(--border)] hover:border-purple-400/50 transition-colors"
              >
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                  <time dateTime={published.toISOString()}>{label}</time>
                  <span aria-hidden="true">·</span>
                  <span>{post.readMinutes} min read</span>
                </div>
                <h3 className="font-semibold text-base text-[var(--text-primary)] mb-1">{post.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-2">{post.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

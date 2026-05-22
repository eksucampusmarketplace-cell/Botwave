/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: [
      '@whiskeysockets/baileys',
      'audio-decode',
      'wa-sticker-formatter',
      'sharp',
      'docx',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Sitemap chunks are now generated on-demand (see app/sitemap.ts) so
        // we explicitly cache them at the edge for 24h. stale-while-revalidate
        // means GSC always gets an instant response — the regen happens in
        // the background after the cached copy goes stale, so a slow render
        // never turns into a "Couldn't fetch" in Search Console.
        source: '/sitemap/:id*.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
  // Permanent redirects for legacy URLs that still show up in Google Search
  // Console as 404s (left over from a pre-Next.js setup on this domain). All
  // redirect to a still-indexed canonical so accumulated link equity isn't
  // lost.
  async redirects() {
    return [
      { source: '/index.php', destination: '/', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/home.php', destination: '/', permanent: true },
      { source: '/home.html', destination: '/', permanent: true },
      { source: '/wp-admin', destination: '/', permanent: true },
      { source: '/wp-login.php', destination: '/login', permanent: true },
    ];
  },
};

module.exports = nextConfig;

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
    ];
  },
  // Strip the `.xml` suffix when routing /sitemap/<id>.xml so the request
  // matches the `app/sitemap/[id]/route.ts` handler (which can accept the
  // raw `.xml` segment too — the rewrite is belt-and-braces). Critically
  // this keeps the externally-visible URL stable for Google Search Console
  // (chunks are still at /sitemap/<id>.xml) while letting the handler set
  // its own Cache-Control header, which `headers()` rules can't reliably
  // override for metadata sitemap routes.
  async rewrites() {
    return [
      { source: '/sitemap/:id(\\d+).xml', destination: '/sitemap/:id' },
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

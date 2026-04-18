/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Compatibility alias: some external test runners assume `/app/api/*` (repo-folder shape).
   * Next.js App Router serves handlers at `/api/*` only; this rewrite preserves additive routing.
   */
  async rewrites() {
    return [{ source: '/app/api/:path*', destination: '/api/:path*' }]
  },
  // Longer-lived dev pages reduce 404s on /_next/static/* when HMR races with the browser.
  onDemandEntries: {
    maxInactiveAge: 90 * 1000,
    pagesBufferLength: 8,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid stale server chunk refs (e.g. Cannot find module './948.js') after interrupted HMR /
      // WSL file sync — dev is slower but more stable than a corrupted .next/server bundle.
      config.cache = false
      // Opt-in: NEXT_DEV_WSL_POLL=1 npm run dev — polling helps some WSL2 setups but can race with
      // Next's config hot-restart; leave off unless file watching misses saves.
      const poll = process.env.NEXT_DEV_WSL_POLL === '1' ? 1000 : undefined
      config.watchOptions = {
        ...(config.watchOptions || {}),
        aggregateTimeout: 400,
        ...(poll ? { poll } : {}),
      }
    }
    return config
  },
}

export default nextConfig

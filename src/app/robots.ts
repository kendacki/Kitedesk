// KiteDesk | robots: index marketing; keep API out of crawlers
import type { MetadataRoute } from 'next'

function siteOrigin(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (u) return u
  return 'https://kitedesk.agiwithai.com'
}

export default function robots(): MetadataRoute.Robots {
  const base = siteOrigin()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}

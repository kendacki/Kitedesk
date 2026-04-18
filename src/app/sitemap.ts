// KiteDesk | sitemap for landing + console (public routes only)
import type { MetadataRoute } from 'next'

function siteOrigin(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (u) return u
  return 'https://kitedesk.agiwithai.com'
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin()
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${base}/desk`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]
}

// KiteDesk | INTERNAL_API_BASE_URL for server-side fetch to this app's /api routes

/**
 * Public origin for server-side HTTP to this deployment (goal agent → /api/x402/search, etc.).
 * Never uses relative `fetch("/api/...")` — always `fetch(\`${BASE_URL}/api/...\`)` so serverless works.
 *
 * Resolution order:
 * 1. INTERNAL_API_BASE_URL (set this on Vercel for deterministic server→self URLs)
 * 2. NEXT_PUBLIC_APP_URL
 * 3. https://VERCEL_URL (Vercel only; logs a hint to prefer INTERNAL_API_BASE_URL)
 * 4. Development: http://127.0.0.1:$PORT
 *
 * Production: throws if no base can be resolved (eliminates silent "Failed to fetch").
 */
export function resolveInternalApiBaseUrl(): string {
  const explicit = process.env.INTERNAL_API_BASE_URL?.replace(/\/$/, '').trim()
  if (explicit) return explicit

  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '').trim()
  if (publicUrl) return publicUrl

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '')
    console.error(
      '[Agent] internal API base: using VERCEL_URL — set INTERNAL_API_BASE_URL to your canonical origin for stable x402 resource URLs'
    )
    return `https://${host}`
  }

  if (process.env.NODE_ENV === 'development') {
    return `http://127.0.0.1:${process.env.PORT ?? '3000'}`
  }

  throw new Error(
    'INTERNAL_API_BASE_URL is required in production for server-side fetch to /api/*. Set it to your deployment origin (e.g. https://your-app.vercel.app), or set NEXT_PUBLIC_APP_URL.'
  )
}

export function requireInternalApiBaseUrl(): string {
  return resolveInternalApiBaseUrl()
}

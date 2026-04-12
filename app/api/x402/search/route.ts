// KiteDesk | x402 paid search resource (delegates to internal search + settle)
import { NextRequest, NextResponse } from 'next/server'
import { executeX402SearchInternal } from '@/lib/x402SearchInternal'

export const runtime = 'nodejs'

function getResourceOrigin(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (explicit) return explicit
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? '3000'}`
}

type SearchBody = {
  query?: string
}

export async function POST(req: NextRequest) {
  const paymentHeader = req.headers.get('x-payment')?.trim()
  const origin = getResourceOrigin(req)

  let body: SearchBody
  try {
    body = (await req.json()) as SearchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const query = typeof body.query === 'string' ? body.query.trim() : ''

  const { status, body: out } = await executeX402SearchInternal({
    query,
    resourceBase: origin,
    xPaymentHeader: paymentHeader,
  })

  return NextResponse.json(out, { status })
}

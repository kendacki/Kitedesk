// KiteDesk | x402 paid search resource (402 challenge + Tavily after settle)
import { tavily } from '@tavily/core'
import { NextRequest, NextResponse } from 'next/server'
import { KITE_X402 } from '@/lib/constants'

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

function build402Body(resourceBase: string) {
  const payTo = process.env.NEXT_PUBLIC_PLATFORM_WALLET ?? ''
  return {
    error: 'X-PAYMENT header is required',
    accepts: [
      {
        scheme: 'gokite-aa',
        network: 'kite-testnet',
        maxAmountRequired: '50000000000000000',
        resource: `${resourceBase}/api/x402/search`,
        description: 'AI Search API - Powered by Tavily via x402',
        mimeType: 'application/json',
        outputSchema: {
          input: {
            discoverable: true,
            method: 'POST',
            queryParams: {
              query: {
                description: 'Search query',
                required: true,
                type: 'string',
              },
            },
            type: 'http',
          },
          output: {
            properties: {
              results: { description: 'Search results array', type: 'array' },
              answer: { description: 'AI synthesized answer', type: 'string' },
            },
            required: ['results'],
            type: 'object',
          },
        },
        payTo,
        maxTimeoutSeconds: 300,
        asset: KITE_X402.tokenAddress,
        extra: null,
        merchantName: 'KiteDesk Search',
      },
    ],
    x402Version: 1,
  }
}

type SearchBody = {
  query?: string
}

type VerifySettleResponse = {
  success?: boolean
  txHash?: string
  error?: string
}

export async function POST(req: NextRequest) {
  const paymentHeader = req.headers.get('x-payment')?.trim()
  const origin = getResourceOrigin(req)

  if (!paymentHeader) {
    return NextResponse.json(build402Body(origin), { status: 402 })
  }

  let body: SearchBody
  try {
    body = (await req.json()) as SearchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const verifyUrl = `${origin}/api/x402/verify-and-settle`
  let verifyRes: Response
  try {
    verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xPaymentHeader: paymentHeader }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'verify-and-settle request failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  let verifyJson: VerifySettleResponse
  try {
    verifyJson = (await verifyRes.json()) as VerifySettleResponse
  } catch {
    return NextResponse.json({ error: 'Invalid verify-and-settle response' }, { status: 502 })
  }

  if (!verifyJson.success) {
    return NextResponse.json(
      {
        error: verifyJson.error ?? 'Payment verification or settlement failed',
        accepts: build402Body(origin).accepts,
        x402Version: 1,
      },
      { status: 402 }
    )
  }

  const apiKey = process.env.TAVILY_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'TAVILY_API_KEY is not configured' }, { status: 503 })
  }

  try {
    const client = tavily({ apiKey })
    const response = await client.search(query, {
      searchDepth: 'basic',
      maxResults: 5,
      includeAnswer: true,
    })
    return NextResponse.json({
      answer: response.answer ?? '',
      results: response.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content.slice(0, 300),
        score: r.score,
      })),
      settlementTxHash: verifyJson.txHash,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Search failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

// KiteDesk | x402 search without self-HTTP (orchestrator + routes share this)
import { ethers } from 'ethers'
import { tavily } from '@tavily/core'
import { KITE_X402, X402_SEARCH_PRICE_USDT } from '@/lib/constants'
import { HttpError } from '@/lib/httpError'
import { getPlatformWalletAddress } from '@/lib/verifyPayment'
import { verifyAndSettleInternal } from '@/lib/x402VerifySettleInternal'

export function buildX402Search402Body(resourceBase: string) {
  const base = resourceBase.replace(/\/$/, '')
  const payTo = getPlatformWalletAddress()
  return {
    error: 'X-PAYMENT header is required',
    accepts: [
      {
        scheme: 'gokite-aa',
        network: 'kite-testnet',
        maxAmountRequired: ethers
          .parseUnits(
            X402_SEARCH_PRICE_USDT.toFixed(KITE_X402.stablecoinDecimals),
            KITE_X402.stablecoinDecimals
          )
          .toString(),
        resource: `${base}/api/x402/search`,
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

type SearchOkBody = {
  answer: string
  results: Array<{ title: string; url: string; content: string; score: number }>
  settlementTxHash?: string
}

export async function executeX402SearchInternal(opts: {
  query: string
  resourceBase: string
  xPaymentHeader?: string
}): Promise<{ status: number; body: unknown }> {
  const query = opts.query.trim()
  const resourceBase = opts.resourceBase.replace(/\/$/, '')
  const xPay = opts.xPaymentHeader?.trim()

  if (!xPay) {
    try {
      return { status: 402, body: buildX402Search402Body(resourceBase) }
    } catch (e) {
      if (e instanceof HttpError) {
        return { status: e.status, body: { error: e.message } }
      }
      const msg =
        e instanceof Error ? e.message : 'x402 challenge could not be built (platform wallet?)'
      return { status: 503, body: { error: msg } }
    }
  }

  if (!query) {
    return { status: 400, body: { error: 'query is required' } }
  }

  const settle = await verifyAndSettleInternal(xPay)
  if (!settle.success) {
    let accepts: unknown
    try {
      accepts = buildX402Search402Body(resourceBase).accepts
    } catch {
      accepts = []
    }
    return {
      status: 402,
      body: {
        error: settle.error ?? 'Payment verification or settlement failed',
        accepts,
        x402Version: 1,
        facilitatorError: settle.facilitatorError,
        directError: settle.directError,
      },
    }
  }

  const apiKey = process.env.TAVILY_API_KEY?.trim()
  if (!apiKey) {
    return { status: 503, body: { error: 'TAVILY_API_KEY is not configured' } }
  }

  try {
    const client = tavily({ apiKey })
    const response = await client.search(query, {
      searchDepth: 'basic',
      maxResults: 5,
      includeAnswer: true,
    })
    const rawResults = response.results ?? []
    const body: SearchOkBody = {
      answer: response.answer ?? '',
      results: rawResults.map((r) => ({
        title: r.title,
        url: r.url,
        content: (r.content ?? '').slice(0, 300),
        score: r.score,
      })),
      settlementTxHash: settle.txHash,
    }
    return { status: 200, body }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Search failed'
    return { status: 502, body: { error: msg } }
  }
}

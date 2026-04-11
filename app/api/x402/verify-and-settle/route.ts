// KiteDesk | x402 verify payment via Pieverse facilitator settle
import { NextRequest, NextResponse } from 'next/server'
import { KITE_X402 } from '@/lib/constants'

export const runtime = 'nodejs'

type SettleRequestBody = {
  xPaymentHeader?: string
}

type XPaymentPayload = {
  authorization?: unknown
  signature?: string
}

function parseXPaymentHeader(raw: string): XPaymentPayload {
  const trimmed = raw.trim()
  let jsonStr: string
  try {
    jsonStr = Buffer.from(trimmed, 'base64').toString('utf8')
  } catch {
    throw new Error('Invalid base64 in X-PAYMENT payload')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr) as unknown
  } catch {
    throw new Error('Invalid JSON in X-PAYMENT payload')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('X-PAYMENT payload must be a JSON object')
  }
  const o = parsed as Record<string, unknown>
  const authorization = o.authorization
  const signature = o.signature
  if (authorization === undefined || authorization === null) {
    throw new Error('Missing authorization in X-PAYMENT payload')
  }
  if (typeof signature !== 'string' || !signature.startsWith('0x')) {
    throw new Error('Missing or invalid signature in X-PAYMENT payload')
  }
  return { authorization, signature }
}

function pickTxHash(data: Record<string, unknown>): string | undefined {
  const candidates = ['txHash', 'transactionHash', 'hash', 'tx']
  for (const k of candidates) {
    const v = data[k]
    if (typeof v === 'string' && v.startsWith('0x')) return v
  }
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SettleRequestBody
    const headerValue = typeof body.xPaymentHeader === 'string' ? body.xPaymentHeader : ''
    if (!headerValue.trim()) {
      return NextResponse.json(
        { success: false, error: 'xPaymentHeader is required' },
        { status: 400 }
      )
    }

    let payload: XPaymentPayload
    try {
      payload = parseXPaymentHeader(headerValue)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid X-PAYMENT'
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    }

    const settleRes = await fetch(KITE_X402.settleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorization: payload.authorization,
        signature: payload.signature,
        network: 'kite-testnet',
      }),
    })

    let settleJson: Record<string, unknown> = {}
    try {
      const text = await settleRes.text()
      if (text) settleJson = JSON.parse(text) as Record<string, unknown>
    } catch {
      settleJson = {}
    }

    if (!settleRes.ok) {
      const errMsg =
        typeof settleJson.error === 'string'
          ? settleJson.error
          : typeof settleJson.message === 'string'
            ? settleJson.message
            : `Facilitator settle failed (${settleRes.status})`
      return NextResponse.json({ success: false, error: errMsg })
    }

    const txHash = pickTxHash(settleJson)
    return NextResponse.json({ success: true, ...(txHash ? { txHash } : {}) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

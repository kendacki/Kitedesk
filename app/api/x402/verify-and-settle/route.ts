// KiteDesk | x402 settlement: PATH A facilitator, PATH B direct ERC20, PATH C both failed (see lib)
import { NextRequest, NextResponse } from 'next/server'
import { verifyAndSettleInternal } from '@/lib/x402VerifySettleInternal'
import { HttpError } from '@/lib/httpError'

export const runtime = 'nodejs'

type SettleRequestBody = {
  xPaymentHeader?: string
}

/**
 * POST body: `{ xPaymentHeader: "<base64 JSON>" }`
 *
 * - **PATH A:** `POST` `KITE_X402.settleUrl` with EIP-3009 `authorization` + `signature`, `network: kite-testnet`,
 *   8s timeout. Success when HTTP status is **200–299**; response may include `txHash`.
 * - **PATH B:** Runs only if PATH A fails. Uses `ATTESTATION_SIGNER_PRIVATE_KEY` wallet; `transfer(payTo, amount)`
 *   on the token at **root-level `asset`** in the X-Payment JSON; `authorization.from` must match the agent wallet;
 *   `authorization.to` is payTo; `authorization.value` is the amount (wei).
 * - **PATH C:** `{ success: false, error: "Both settlement paths failed", facilitatorError, directError }`.
 */
export async function POST(req: NextRequest) {
  let body: SettleRequestBody
  try {
    body = (await req.json()) as SettleRequestBody
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  try {
    const headerValue =
      typeof body.xPaymentHeader === 'string' ? body.xPaymentHeader : ''
    if (!headerValue.trim()) {
      return NextResponse.json(
        { success: false, error: 'xPaymentHeader is required' },
        { status: 400 }
      )
    }

    const result = await verifyAndSettleInternal(headerValue)
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error ?? 'Settlement failed',
        facilitatorError: result.facilitatorError,
        directError: result.directError,
      })
    }

    return NextResponse.json({
      success: true,
      ...(result.txHash ? { txHash: result.txHash } : {}),
      ...(result.path ? { path: result.path } : {}),
    })
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: e.message },
        { status: e.status }
      )
    }
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

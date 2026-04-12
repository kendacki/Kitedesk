// KiteDesk | PATH A: Pieverse /v2/settle; PATH B: direct ERC20 transfer; PATH C: both failed
import { ethers } from 'ethers'
import { KITE_CHAIN, KITE_X402 } from '@/lib/constants'
import { parseXPaymentHeader } from '@/lib/x402PaymentPayload'

const ERC20_TRANSFER_ABI = ['function transfer(address,uint256) returns(bool)'] as const

function pickTxHash(data: Record<string, unknown>): string | undefined {
  const candidates = ['txHash', 'transactionHash', 'hash', 'tx']
  for (const k of candidates) {
    const v = data[k]
    if (typeof v === 'string' && v.startsWith('0x')) return v
  }
  return undefined
}

async function settleViaFacilitator(
  authorization: unknown,
  signature: string
): Promise<{ ok: true; txHash?: string } | { ok: false; error: string }> {
  const settleUrl = KITE_X402.settleUrl
  let settleRes: Response
  try {
    settleRes = await fetch(settleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorization,
        signature,
        network: 'kite-testnet',
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Facilitator request failed'
    return { ok: false, error: msg }
  }

  const statusOk = settleRes.status >= 200 && settleRes.status < 300
  let settleJson: Record<string, unknown> = {}
  try {
    const text = await settleRes.text()
    if (text) settleJson = JSON.parse(text) as Record<string, unknown>
  } catch {
    settleJson = {}
  }

  if (!statusOk) {
    const errMsg =
      typeof settleJson.error === 'string'
        ? settleJson.error
        : typeof settleJson.message === 'string'
          ? settleJson.message
          : `Facilitator settle failed (${settleRes.status})`
    return { ok: false, error: errMsg }
  }

  const txHash = pickTxHash(settleJson)
  return { ok: true, ...(txHash ? { txHash } : {}) }
}

async function settleViaDirectTransfer(
  parsed: ReturnType<typeof parseXPaymentHeader>
): Promise<{ ok: true; txHash: string } | { ok: false; error: string }> {
  if (!parsed.asset || !parsed.asset.trim()) {
    return {
      ok: false,
      error:
        'X-Payment payload missing root-level asset (token contract); required for direct settlement fallback',
    }
  }

  const pk = process.env.ATTESTATION_SIGNER_PRIVATE_KEY?.trim()
  if (!pk) {
    return { ok: false, error: 'ATTESTATION_SIGNER_PRIVATE_KEY is not configured' }
  }

  const provider = new ethers.JsonRpcProvider(KITE_CHAIN.rpcUrl)
  const wallet = new ethers.Wallet(pk, provider)
  const auth = parsed.authorization
  const fromNorm = ethers.getAddress(auth.from)
  const payTo = ethers.getAddress(auth.to)
  if (fromNorm.toLowerCase() !== wallet.address.toLowerCase()) {
    return {
      ok: false,
      error: `authorization.from (${fromNorm}) does not match agent wallet (${wallet.address})`,
    }
  }

  let amount: bigint
  try {
    amount = BigInt(auth.value)
  } catch {
    return { ok: false, error: 'Invalid authorization.value' }
  }

  let asset: string
  try {
    asset = ethers.getAddress(parsed.asset)
  } catch {
    return { ok: false, error: 'Invalid asset address in X-Payment payload' }
  }

  const token = new ethers.Contract(asset, ERC20_TRANSFER_ABI, wallet)
  try {
    const tx = await token.transfer(payTo, amount)
    const receipt = await tx.wait()
    if (!receipt || receipt.status !== 1) {
      return { ok: false, error: 'Direct transfer transaction failed' }
    }
    return { ok: true, txHash: receipt.hash }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Direct transfer failed'
    return { ok: false, error: msg }
  }
}

export type VerifySettleInternalResult = {
  success: boolean
  txHash?: string
  path?: 'facilitator' | 'direct'
  error?: string
  facilitatorError?: string
  directError?: string
}

/**
 * PATH A: POST KITE_X402.settleUrl with parsed authorization + signature; success if HTTP 200–299.
 * PATH B: If A fails or times out (8s), ERC20 transfer from agent wallet to authorization.to using
 *          authorization.value wei; asset is root-level `asset` on the X-Payment JSON (not inside authorization).
 * PATH C: Both failed — error "Both settlement paths failed" plus facilitatorError and directError.
 */
export async function verifyAndSettleInternal(
  xPaymentHeader: string
): Promise<VerifySettleInternalResult> {
  let parsed: ReturnType<typeof parseXPaymentHeader>
  try {
    parsed = parseXPaymentHeader(xPaymentHeader)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid X-PAYMENT'
    return { success: false, error: msg, facilitatorError: msg, directError: msg }
  }

  const authObj = {
    from: parsed.authorization.from,
    to: parsed.authorization.to,
    value: parsed.authorization.value,
    validAfter: parsed.authorization.validAfter,
    validBefore: parsed.authorization.validBefore,
    nonce: parsed.authorization.nonce,
  }

  const fac = await settleViaFacilitator(authObj, parsed.signature)
  if (fac.ok) {
    return { success: true, txHash: fac.txHash, path: 'facilitator' }
  }

  const facilitatorError = fac.error
  const direct = await settleViaDirectTransfer(parsed)
  if (direct.ok) {
    return { success: true, txHash: direct.txHash, path: 'direct' }
  }

  return {
    success: false,
    error: 'Both settlement paths failed',
    facilitatorError,
    directError: direct.error,
  }
}

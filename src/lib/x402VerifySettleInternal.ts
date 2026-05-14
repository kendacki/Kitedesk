// KiteDesk | PATH A: Pieverse /v2/settle; PATH B: direct ERC20 transfer; PATH C: both failed
import { ethers } from 'ethers'
import { KITE_CHAIN, KITE_X402 } from '@/lib/constants'
import { parseXPaymentHeader } from '@/lib/x402PaymentPayload'
import { getDecryptedSessionKeyWalletBySessionAddress } from '@/lib/sessionKeys'

const ERC20_TRANSFER_ABI = [
  'function transfer(address,uint256) returns(bool)',
  'function balanceOf(address) view returns(uint256)',
] as const

function pickTxHash(data: Record<string, unknown>): string | undefined {
  const candidates = ['txHash', 'transactionHash', 'hash', 'tx']
  for (const k of candidates) {
    const v = data[k]
    if (typeof v === 'string' && v.startsWith('0x')) return v
  }
  return undefined
}

async function settleViaFacilitator(
  paymentPayload: string,
  network: string,
  paymentRequirements?: unknown
): Promise<{ ok: true; txHash?: string } | { ok: false; error: string }> {
  const settleUrl = KITE_X402.settleUrl
  let settleRes: Response
  try {
    // Send the base64 payload + requirements to the facilitator
    const body: Record<string, unknown> = {
      paymentPayload: paymentPayload.trim(),
      network,
      x402Version: 1,
    }
    if (paymentRequirements) {
      body.paymentRequirements = paymentRequirements
    }
    settleRes = await fetch(settleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Facilitator request failed'
    console.error('[x402] Facilitator request error:', { message: msg, error: e })
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
    console.error('[x402] Facilitator settlement failed:', {
      status: settleRes.status,
      error: errMsg,
      response: settleJson,
    })
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

  const provider = new ethers.JsonRpcProvider(KITE_CHAIN.rpcUrl)
  const auth = parsed.authorization
  const fromNorm = ethers.getAddress(auth.from)
  const payTo = ethers.getAddress(auth.to)

  // Prefer to use a matching session-key wallet if available (server can decrypt session keys)
  let wallet: ethers.Wallet | null = null
  try {
    const sessionWallet = await getDecryptedSessionKeyWalletBySessionAddress(fromNorm, provider)
    if (sessionWallet) wallet = sessionWallet
  } catch (e) {
    console.warn('[x402] Failed to load session-key wallet for direct settlement:', e)
  }

  // Fallback to attestation signer if no session key wallet found
  if (!wallet) {
    const pk = process.env.ATTESTATION_SIGNER_PRIVATE_KEY?.trim()
    if (!pk) {
      return { ok: false, error: 'ATTESTATION_SIGNER_PRIVATE_KEY is not configured' }
    }
    wallet = new ethers.Wallet(pk, provider)
    if (fromNorm.toLowerCase() !== wallet.address.toLowerCase()) {
      return {
        ok: false,
        error: `authorization.from (${fromNorm}) does not match available settlement wallet (${wallet.address})`,
      }
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

  // Validate the contract is deployed and has code
  const code = await provider.getCode(asset)
  if (!code || code === '0x') {
    console.warn('[x402] Contract not found at asset address:', asset)
    return {
      ok: false,
      error: `Contract not found at token address ${asset} on ${KITE_CHAIN.name}`,
    }
  }

  const token = new ethers.Contract(asset, ERC20_TRANSFER_ABI, wallet)
  try {
    // Check balance first to avoid wasting gas on a doomed transaction
    const balance = await token.balanceOf(wallet.address).catch(() => null)
    if (balance === null || balance < amount) {
      const balStr = balance ? ethers.formatUnits(balance, 6) : 'unknown'
      const amountStr = ethers.formatUnits(amount, 6)
      console.error('[x402] Insufficient token balance for transfer:', {
        balance: balStr,
        required: amountStr,
        wallet: wallet.address,
        asset,
      })
      return {
        ok: false,
        error: `Insufficient token balance: have ${balStr}, need ${amountStr}`,
      }
    }

    const tx = await token.transfer(payTo, amount)
    const receipt = await tx.wait()
    if (!receipt || receipt.status !== 1) {
      return { ok: false, error: 'Direct transfer transaction failed' }
    }
    return { ok: true, txHash: receipt.hash }
  } catch (e) {
    // Enhanced error handling for contract revert exceptions
    let msg = 'Direct transfer failed'
    let details = ''

    if (e instanceof Error) {
      msg = e.message
      // Try to extract contract revert reason from ethers.js error
      const errObj = e as unknown as Record<string, unknown>
      if (errObj.code === 'CALL_EXCEPTION') {
        // Ethers.js CALL_EXCEPTION with revert details
        if (typeof errObj.reason === 'string' && errObj.reason) {
          details = `; contract reason: ${errObj.reason}`
        } else {
          details =
            '; contract reverted without explicit reason (check contract implementation)'
        }
        if (typeof errObj.transaction === 'object' && errObj.transaction) {
          const tx = errObj.transaction as Record<string, unknown>
          console.error('[x402] Contract call failed during gas estimation:', {
            to: tx.to,
            from: tx.from,
            data: String(tx.data).slice(0, 100),
            value: tx.value,
          })
        }
      }
      // Log full error for debugging
      console.error('[x402] Direct transfer contract call error:', {
        code: errObj.code,
        reason: errObj.reason,
        revert: errObj.revert,
        errorMessage: msg,
      })
    }

    return {
      ok: false,
      error: `Direct transfer settlement unavailable: ${msg}${details}. Ensure agent wallet has sufficient token balance and correct contract is deployed.`,
    }
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
  xPaymentHeader: string,
  paymentRequirements?: unknown
): Promise<VerifySettleInternalResult> {
  let parsed: ReturnType<typeof parseXPaymentHeader>
  try {
    parsed = parseXPaymentHeader(xPaymentHeader)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid X-PAYMENT'
    return { success: false, error: msg, facilitatorError: msg, directError: msg }
  }

  const fac = await settleViaFacilitator(xPaymentHeader, 'kite-testnet', paymentRequirements)
  if (fac.ok) {
    return { success: true, txHash: fac.txHash, path: 'facilitator' }
  }

  const facilitatorError = fac.ok ? '' : fac.error
  const direct = await settleViaDirectTransfer(parsed)
  if (direct.ok) {
    return { success: true, txHash: direct.txHash, path: 'direct' }
  }

  return {
    success: false,
    error: 'Both settlement paths failed',
    facilitatorError,
    directError: direct.ok ? '' : direct.error,
  }
}

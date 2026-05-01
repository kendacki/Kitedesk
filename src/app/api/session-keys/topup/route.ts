import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getSessionKeyByIdForUser } from '@/lib/sessionKeys'
import { HttpError } from '@/lib/httpError'
import { KITE_CHAIN, CONTRACTS, KITE_X402 } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userSmartWallet =
      typeof body.userSmartWallet === 'string' ? body.userSmartWallet : ''
    const keyId = typeof body.keyId === 'string' ? body.keyId : ''
    const txHash = typeof body.txHash === 'string' ? body.txHash : ''

    if (!userSmartWallet || !keyId || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!ethers.isAddress(userSmartWallet)) {
      return NextResponse.json({ error: 'Invalid userSmartWallet' }, { status: 400 })
    }

    const record = await getSessionKeyByIdForUser(userSmartWallet, keyId)
    if (!record) {
      return NextResponse.json({ error: 'Session key not found' }, { status: 404 })
    }

    // Verify transaction exists and is a transfer to the session key address for USDT
    const provider = new ethers.JsonRpcProvider(
      process.env.KITE_RPC_URL || KITE_CHAIN.rpcUrl
    )
    const tx = await provider.getTransaction(txHash)
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 400 })
    }

    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt || receipt.status !== 1 || typeof receipt.blockNumber !== 'number') {
      return NextResponse.json({ error: 'Transaction failed or not confirmed' }, { status: 400 })
    }

    // Parse Transfer logs to check transfer(s) to session key (supports relayers/wrappers)
    const TRANSFER_IFACE = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ])

    const usdt = CONTRACTS.usdt
    if (!usdt || !ethers.isAddress(usdt)) {
      return NextResponse.json({ error: 'USDT contract not configured' }, { status: 500 })
    }

    // Sum total USDT units transferred to the session key in this receipt
    let totalTransferredUnits = BigInt(0)
    for (const log of receipt.logs) {
      try {
        if (!log.address) continue
        if (ethers.getAddress(log.address) !== ethers.getAddress(usdt)) continue
        const parsed = TRANSFER_IFACE.parseLog({ topics: log.topics as string[], data: log.data })
        if (!parsed) continue
        const from = ethers.getAddress(String(parsed.args.from))
        const to = ethers.getAddress(String(parsed.args.to))
        if (to === ethers.getAddress(record.session_key_address) && from === ethers.getAddress(userSmartWallet)) {
          const amount = BigInt(String(parsed.args.value))
          totalTransferredUnits += amount
        }
      } catch {
        continue
      }
    }

    if (totalTransferredUnits === BigInt(0)) {
      return NextResponse.json({ error: 'No matching USDT transfer to session key found in receipt' }, { status: 400 })
    }

    // Confirmations check to avoid transient reorgs
    const minConfirmations = Number(process.env.SESSION_KEY_MIN_CONFIRMATIONS || '2')
    const latestBlock = await provider.getBlockNumber()
    const confirmations = latestBlock - Number(receipt.blockNumber)
    if (confirmations < minConfirmations) {
      return NextResponse.json({ error: 'Transaction has insufficient confirmations' }, { status: 400 })
    }

    // Amount validation: require at least the configured per-tx max or daily limit
    const recAmounts = record as unknown as { max_per_tx_usdt?: number; daily_limit_usdt?: number }
    const requiredUsdt = Number(recAmounts.max_per_tx_usdt || recAmounts.daily_limit_usdt || 0)
    if (requiredUsdt > 0) {
      const tokenDecimals = Number(KITE_X402.stablecoinDecimals || 6)
      const requiredUnits = ethers.parseUnits(String(requiredUsdt), tokenDecimals)
      // allow small slippage (0.5%)
      const slippageNumerator = BigInt(995)
      const slippageDenominator = BigInt(1000)
      const minAccepted = (BigInt(requiredUnits.toString()) * slippageNumerator) / slippageDenominator
      if (totalTransferredUnits < minAccepted) {
        return NextResponse.json({
          error: 'Transferred amount is less than required funding amount',
          details: { requiredUsdt, tokenDecimals, totalTransferredUnits: totalTransferredUnits.toString() },
        }, { status: 400 })
      }
    }

    return NextResponse.json(
      { success: true, message: 'Session key top-up verified' },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (err instanceof HttpError) {
      return NextResponse.json({ error: message }, { status: err.status })
    }
    console.error('[API] /session-keys/topup error:', message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

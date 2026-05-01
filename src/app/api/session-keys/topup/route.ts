import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getSessionKeyByIdForUser } from '@/lib/sessionKeys'
import { HttpError } from '@/lib/httpError'
import { KITE_CHAIN, CONTRACTS } from '@/lib/constants'

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

    if (!tx.from || ethers.getAddress(tx.from) !== ethers.getAddress(userSmartWallet)) {
      return NextResponse.json(
        { error: 'Transaction must be sent from the user wallet' },
        { status: 400 }
      )
    }

    // Ensure tx interacts with USDT contract
    const usdt = CONTRACTS.usdt
    if (!usdt || !ethers.isAddress(usdt)) {
      return NextResponse.json(
        { error: 'USDT contract not configured' },
        { status: 500 }
      )
    }

    if (!tx.to || ethers.getAddress(tx.to) !== ethers.getAddress(usdt)) {
      return NextResponse.json(
        { error: 'Transaction must call the USDT contract' },
        { status: 400 }
      )
    }

    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt || receipt.status !== 1) {
      return NextResponse.json(
        { error: 'Transaction failed or not confirmed' },
        { status: 400 }
      )
    }

    // Parse Transfer logs to check transfer to session key
    const TRANSFER_IFACE = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ])
    let funded = false
    for (const log of receipt.logs) {
      try {
        if (!log.address || ethers.getAddress(log.address) !== ethers.getAddress(usdt))
          continue
        const parsed = TRANSFER_IFACE.parseLog({
          topics: log.topics as string[],
          data: log.data,
        })
        if (!parsed) continue
        const from = ethers.getAddress(String(parsed.args.from))
        const to = ethers.getAddress(String(parsed.args.to))
        if (
          from === ethers.getAddress(userSmartWallet) &&
          to === ethers.getAddress(record.session_key_address)
        ) {
          const amount = BigInt(String(parsed.args.value))
          if (amount > BigInt(0)) {
            funded = true
            break
          }
        }
      } catch {
        continue
      }
    }

    if (!funded) {
      return NextResponse.json(
        { error: 'No matching USDT transfer to session key found in receipt' },
        { status: 400 }
      )
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

import { ethers } from 'ethers'
import { createSessionKey } from '@/lib/sessionKeys'
import { HttpError } from '@/lib/httpError'
import { getPlatformWalletAddress } from '@/lib/verifyPayment'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      userSmartWallet,
      signature,
      authorizationMessage,
      budgetUsdt,
      maxPerTxUsdt = Math.min(50, budgetUsdt),
      expiresInHours = 24,
      whitelistedRecipients = [],
    } = body as {
      userSmartWallet: string
      signature: string
      authorizationMessage?: string
      budgetUsdt: number
      maxPerTxUsdt?: number
      expiresInHours?: number
      whitelistedRecipients?: string[]
    }

    if (!userSmartWallet || !signature || !authorizationMessage || !budgetUsdt) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!ethers.isAddress(userSmartWallet)) {
      return Response.json({ error: 'Invalid smart wallet address' }, { status: 400 })
    }

    // Auto-populate whitelistedRecipients with the platform payTo address if not provided.
    // That keeps freshly signed-in users eligible for x402 queries immediately.
    let recipients = whitelistedRecipients || []
    if (recipients.length === 0) {
      recipients = [getPlatformWalletAddress(), ethers.getAddress(userSmartWallet)]
    } else {
      // Normalize provided addresses
      recipients = recipients.map((r: string) => ethers.getAddress(r))
    }

    if (recipients.some((r: string) => !ethers.isAddress(r))) {
      return Response.json({ error: 'Invalid recipient address' }, { status: 400 })
    }

    if (budgetUsdt <= 0) {
      return Response.json({ error: 'Budget must be positive' }, { status: 400 })
    }

    const recovered = ethers.verifyMessage(authorizationMessage, signature)
    if (ethers.getAddress(recovered) !== ethers.getAddress(userSmartWallet)) {
      return Response.json(
        { error: 'Invalid session key authorization signature' },
        {
          status: 401,
        }
      )
    }

    const result = await createSessionKey({
      userSmartWallet,
      budgetUsdt,
      maxPerTxUsdt,
      expiresInHours,
      whitelistedRecipients: recipients as string[],
    })

    return Response.json(
      {
        keyId: result.keyId,
        sessionKeyAddress: result.sessionKeyAddress,
        expiresAt: result.expiresAt,
        budgetUsdt,
        maxPerTxUsdt,
        status: 'created',
        message: 'Session key created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[API] /session-keys/create error:', message)

    if (error instanceof HttpError) {
      return Response.json({ error: message }, { status: error.status })
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

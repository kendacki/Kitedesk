import { ethers } from 'ethers'
import { revokeSessionKey } from '@/lib/sessionKeys'
import { HttpError } from '@/lib/httpError'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { userSmartWallet, keyId } = body as {
      userSmartWallet: string
      keyId: string
    }

    if (!userSmartWallet || !keyId) {
      return Response.json(
        { error: 'Missing userSmartWallet or keyId' },
        { status: 400 }
      )
    }

    if (!ethers.isAddress(userSmartWallet)) {
      return Response.json(
        { error: 'Invalid smart wallet address' },
        { status: 400 }
      )
    }

    await revokeSessionKey(userSmartWallet, keyId)

    return Response.json(
      {
        status: 'revoked',
        keyId,
        message: 'Session key revoked successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[API] /session-keys/revoke error:', message)

    if (error instanceof HttpError) {
      return Response.json({ error: message }, { status: error.status })
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

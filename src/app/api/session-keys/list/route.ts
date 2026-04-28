import { ethers } from 'ethers'
import { listSessionKeysForUser } from '@/lib/sessionKeys'
import { HttpError } from '@/lib/httpError'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const wallet = url.searchParams.get('wallet')

    if (!wallet) {
      return Response.json(
        { error: 'Missing wallet parameter' },
        { status: 400 }
      )
    }

    if (!ethers.isAddress(wallet)) {
      return Response.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      )
    }

    const keys = await listSessionKeysForUser(wallet)

    return Response.json(
      {
        wallet,
        keys,
        total: keys.length,
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[API] /session-keys/list error:', message)

    if (error instanceof HttpError) {
      return Response.json({ error: message }, { status: error.statusCode })
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

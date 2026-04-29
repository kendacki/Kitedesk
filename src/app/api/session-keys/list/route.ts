import { NextRequest } from 'next/server'
import { ethers } from 'ethers'
import { listSessionKeysForUser } from '@/lib/sessionKeys'
import { HttpError } from '@/lib/httpError'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const wallet = typeof body.userSmartWallet === 'string' ? body.userSmartWallet : ''

    if (!wallet) {
      return Response.json({ error: 'Missing userSmartWallet' }, { status: 400 })
    }

    if (!ethers.isAddress(wallet)) {
      return Response.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const keys = await listSessionKeysForUser(wallet)

    return Response.json(
      {
        wallet,
        sessionKeys: keys,
        total: keys.length,
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[API] /session-keys/list (POST) error:', message)

    if (error instanceof HttpError) {
      return Response.json({ error: message }, { status: error.status })
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const wallet = url.searchParams.get('wallet')

    if (!wallet) {
      return Response.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    if (!ethers.isAddress(wallet)) {
      return Response.json({ error: 'Invalid wallet address' }, { status: 400 })
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
      return Response.json({ error: message }, { status: error.status })
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

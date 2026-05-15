import { createClient } from 'npm:@supabase/supabase-js@2'
import { ethers } from 'npm:ethers@6.16.0'

type SessionKeyRow = {
  id: string
  main_wallet_address?: string | null
  user_smart_wallet?: string | null
  session_key_address?: string | null
  delegation_signature?: string | null
  expires_at?: string | null
  created_at?: string | null
  revoked?: boolean | null
}

type RelayerExecBody = {
  data?: unknown
  sessionKeyAddress?: unknown
  requestSignature?: unknown
  contractAddress?: unknown
  queryResult?: unknown
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function getEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? ''
}

function normalizeAddress(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (!ethers.isAddress(value)) return ''
  return ethers.getAddress(value)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'string' ? value : JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  const parts = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
  return `{${parts.join(',')}}`
}

function messageForSignature(data: unknown): string {
  if (typeof data === 'string') return data
  return stableStringify(data)
}

function getContractAddress(overrideAddress?: unknown): string {
  const fromBody = normalizeAddress(overrideAddress)
  if (fromBody) return fromBody

  const fromEnv =
    normalizeAddress(getEnv('KITE_ATTESTATION_CONTRACT')) ||
    normalizeAddress(getEnv('NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT'))

  if (fromEnv) return fromEnv

  throw new Error(
    'Missing contract address. Set KITE_ATTESTATION_CONTRACT or NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT in Supabase secrets.'
  )
}

function getRpcUrl(): string {
  return (
    getEnv('CONTRACT_OWNER_RPC_URL') ||
    getEnv('KITE_RPC_URL') ||
    getEnv('NEXT_PUBLIC_KITE_RPC_URL') ||
    'https://rpc-testnet.gokite.ai'
  )
}

async function loadSessionKeyRecord(
  supabase: ReturnType<typeof createClient>,
  sessionKeyAddress: string
): Promise<SessionKeyRow | null> {
  const { data, error } = await supabase
    .from('session_keys')
    .select('*')
    .eq('session_key_address', sessionKeyAddress)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to query session_keys: ${error.message}`)
  }

  const row = data as SessionKeyRow | null
  if (!row) return null
  if (row.revoked) return null

  if (!row.expires_at) return null
  const expiresAt = new Date(row.expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) return null

  return row
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: RelayerExecBody
  try {
    body = (await req.json()) as RelayerExecBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const sessionKeyAddress = normalizeAddress(body.sessionKeyAddress)
  if (!sessionKeyAddress) {
    return jsonResponse({ signed: false, error: 'sessionKeyAddress is required and must be valid' }, 400)
  }

  const requestSignature = typeof body.requestSignature === 'string' ? body.requestSignature.trim() : ''
  if (!requestSignature) {
    return jsonResponse({ signed: false, error: 'requestSignature is required' }, 400)
  }

  const data = body.data
  if (typeof data !== 'string' || !data.startsWith('0x')) {
    return jsonResponse(
      {
        signed: false,
        error: 'data must be a hex-encoded calldata string that can be submitted to the contract',
      },
      400
    )
  }

  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        signed: false,
        error:
          'Supabase secrets are incomplete. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the relayer function.',
      },
      503
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let sessionKeyRecord: SessionKeyRow | null = null
  try {
    sessionKeyRecord = await loadSessionKeyRecord(supabase, sessionKeyAddress)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ signed: false, error: message }, 500)
  }

  if (!sessionKeyRecord) {
    return jsonResponse(
      {
        signed: false,
        error: 'No active session key found for sessionKeyAddress or the key is expired/revoked',
      },
      403
    )
  }

  const signedMessage = messageForSignature(data)
  let recoveredAddress: string
  try {
    recoveredAddress = ethers.verifyMessage(signedMessage, requestSignature)
  } catch {
    return jsonResponse({ signed: false, error: 'requestSignature is not a valid signature' }, 403)
  }

  if (recoveredAddress.toLowerCase() !== sessionKeyAddress.toLowerCase()) {
    return jsonResponse(
      {
        signed: false,
        error: 'requestSignature was not signed by the provided sessionKeyAddress',
      },
      403
    )
  }

  const contractAddress = getContractAddress(body.contractAddress)
  const contractOwnerPrivateKey = getEnv('CONTRACT_OWNER_PRIVATE_KEY')
  if (!contractOwnerPrivateKey) {
    return jsonResponse(
      {
        signed: false,
        error:
          'CONTRACT_OWNER_PRIVATE_KEY is not configured. Set it in Supabase Secrets for the relayer function.',
      },
      503
    )
  }

  const provider = new ethers.JsonRpcProvider(getRpcUrl())
  const wallet = new ethers.Wallet(contractOwnerPrivateKey, provider)

  // Supabase Secrets setup:
  // - CONTRACT_OWNER_PRIVATE_KEY must be stored in the project secrets for this edge function.
  // - Use the wallet that actually owns the target onlyOwner contract.
  try {
    const tx = await wallet.sendTransaction({
      to: contractAddress,
      data,
    })
    const receipt = await tx.wait()
    if (!receipt || receipt.status !== 1) {
      throw new Error('Transaction reverted or was not confirmed')
    }

    return jsonResponse({
      signed: true,
      txHash: receipt.hash,
      contractAddress,
      sessionKeyAddress,
      mainWalletAddress:
        normalizeAddress(sessionKeyRecord.main_wallet_address) ||
        normalizeAddress(sessionKeyRecord.user_smart_wallet) ||
        null,
      queryResult: body.queryResult ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    // Non-fatal goal-run path: if the blockchain submission fails, return the query result anyway.
    return jsonResponse(
      {
        signed: false,
        txHash: null,
        contractAddress,
        sessionKeyAddress,
        mainWalletAddress:
          normalizeAddress(sessionKeyRecord.main_wallet_address) ||
          normalizeAddress(sessionKeyRecord.user_smart_wallet) ||
          null,
        queryResult: body.queryResult ?? null,
        error: `Relayer execution failed: ${message}`,
      },
      200
    )
  }
})

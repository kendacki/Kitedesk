import { ethers } from 'ethers'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError } from '@/lib/httpError'
import crypto from 'crypto'

export interface SessionKeyRecord {
  id: string
  user_smart_wallet: string
  session_key_private_key_encrypted: string
  session_key_address: string
  max_amount_usdt: number
  daily_limit_usdt: number
  max_per_tx_usdt: number
  expires_at: string
  key_id: string
  whitelisted_recipients: string[]
  revoked: boolean
  created_at: string
  used_count: number
}

const ENCRYPTION_ALGORITHM = 'aes-256-cbc'
const KEY_DERIVATION_ITERATIONS = 100000

function getEncryptionKey(userSmartWallet: string): Buffer {
  const secret = process.env.SESSION_KEY_ENCRYPTION_SECRET
  if (!secret) {
    throw new HttpError('SESSION_KEY_ENCRYPTION_SECRET not configured', 503)
  }

  const salt = Buffer.from(ethers.getAddress(userSmartWallet).slice(2), 'hex').slice(0, 16)

  return crypto.pbkdf2Sync(
    Buffer.from(secret, 'utf-8'),
    salt,
    KEY_DERIVATION_ITERATIONS,
    32,
    'sha256'
  )
}

export function encryptPrivateKey(privateKey: string, userSmartWallet: string): string {
  const key = getEncryptionKey(userSmartWallet)
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  let encrypted = cipher.update(privateKey, 'utf-8', 'hex')
  encrypted += cipher.final('hex')

  return `${iv.toString('hex')}:${encrypted}`
}

export function decryptPrivateKey(encryptedData: string, userSmartWallet: string): string {
  const key = getEncryptionKey(userSmartWallet)
  const [ivHex, encrypted] = encryptedData.split(':')

  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)

  let decrypted = decipher.update(encrypted, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')

  return decrypted
}

export async function createSessionKey(params: {
  userSmartWallet: string
  budgetUsdt: number
  maxPerTxUsdt?: number
  dailyLimitUsdt?: number
  expiresInHours?: number
  whitelistedRecipients: string[]
}): Promise<{
  keyId: string
  sessionKeyAddress: string
  sessionKeyPrivateKey: string
  expiresAt: string
}> {
  const {
    userSmartWallet,
    budgetUsdt,
    maxPerTxUsdt = Math.min(50, budgetUsdt),
    dailyLimitUsdt = budgetUsdt,
    expiresInHours = 24,
    whitelistedRecipients,
  } = params

  if (!ethers.isAddress(userSmartWallet)) {
    throw new HttpError('Invalid smart wallet address', 400)
  }

  if (maxPerTxUsdt > dailyLimitUsdt) {
    throw new HttpError('maxPerTxUsdt must be <= dailyLimitUsdt', 400)
  }

  if (whitelistedRecipients.length === 0) {
    throw new HttpError('Must provide at least one whitelisted recipient', 400)
  }

  const wallet = ethers.Wallet.createRandom()
  const sessionKeyPrivateKey = wallet.privateKey
  const sessionKeyAddress = wallet.address

  const keyId = ethers.hexlify(ethers.randomBytes(32))
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()

  const encryptedPrivateKey = encryptPrivateKey(sessionKeyPrivateKey, userSmartWallet)

  const db = getSupabaseAdmin()
  if (!db) {
    throw new HttpError('Database not configured', 503)
  }

  const { error } = await db.from('session_keys').insert({
    user_smart_wallet: ethers.getAddress(userSmartWallet),
    session_key_private_key_encrypted: encryptedPrivateKey,
    session_key_address: ethers.getAddress(sessionKeyAddress),
    max_amount_usdt: maxPerTxUsdt,
    daily_limit_usdt: dailyLimitUsdt,
    max_per_tx_usdt: maxPerTxUsdt,
    expires_at: expiresAt,
    key_id: keyId,
    whitelisted_recipients: whitelistedRecipients.map((r) => ethers.getAddress(r)),
    revoked: false,
    created_at: new Date().toISOString(),
    used_count: 0,
  })

  if (error) {
    throw new HttpError(`Failed to store session key: ${error.message}`, 500)
  }

  return {
    keyId,
    sessionKeyAddress,
    sessionKeyPrivateKey,
    expiresAt,
  }
}

export async function getSessionKeyForUser(
  userSmartWallet: string
): Promise<SessionKeyRecord | null> {
  const db = getSupabaseAdmin()
  if (!db) {
    throw new HttpError('Database not configured', 503)
  }

  const checksumAddress = ethers.getAddress(userSmartWallet)

  const { data, error } = await db
    .from('session_keys')
    .select('*')
    .eq('user_smart_wallet', checksumAddress)
    .eq('revoked', false)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new HttpError(`Failed to retrieve session key: ${error.message}`, 500)
  }

  if (!data || data.length === 0) {
    return null
  }

  const record = data[0] as SessionKeyRecord

  if (new Date(record.expires_at) < new Date()) {
    return null
  }

  return record
}

export async function getDecryptedSessionKeyWallet(
  userSmartWallet: string,
  provider: ethers.JsonRpcProvider
): Promise<ethers.Wallet | null> {
  const record = await getSessionKeyForUser(userSmartWallet)
  if (!record) {
    return null
  }

  try {
    const decryptedPrivateKey = decryptPrivateKey(
      record.session_key_private_key_encrypted,
      userSmartWallet
    )
    return new ethers.Wallet(decryptedPrivateKey, provider)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[SessionKeys] Failed to decrypt session key:', msg)
    return null
  }
}

export async function revokeSessionKey(
  userSmartWallet: string,
  keyId: string
): Promise<void> {
  const db = getSupabaseAdmin()
  if (!db) {
    throw new HttpError('Database not configured', 503)
  }

  const checksumAddress = ethers.getAddress(userSmartWallet)

  const { error } = await db
    .from('session_keys')
    .update({ revoked: true })
    .eq('user_smart_wallet', checksumAddress)
    .eq('key_id', keyId)

  if (error) {
    throw new HttpError(`Failed to revoke session key: ${error.message}`, 500)
  }
}

export async function listSessionKeysForUser(userSmartWallet: string): Promise<
  Array<{
    keyId: string
    sessionKeyAddress: string
    maxPerTxUsdt: number
    dailyLimitUsdt: number
    expiresAt: string
    revoked: boolean
    usedCount: number
  }>
> {
  const db = getSupabaseAdmin()
  if (!db) {
    throw new HttpError('Database not configured', 503)
  }

  const checksumAddress = ethers.getAddress(userSmartWallet)

  const { data, error } = await db
    .from('session_keys')
    .select(
      'key_id, session_key_address, max_per_tx_usdt, daily_limit_usdt, expires_at, revoked, used_count'
    )
    .eq('user_smart_wallet', checksumAddress)
    .order('created_at', { ascending: false })

  if (error) {
    throw new HttpError(`Failed to list session keys: ${error.message}`, 500)
  }

  return (data || []).map((row) => ({
    keyId: (row as Record<string, unknown>).key_id as string,
    sessionKeyAddress: (row as Record<string, unknown>).session_key_address as string,
    maxPerTxUsdt: (row as Record<string, unknown>).max_per_tx_usdt as number,
    dailyLimitUsdt: (row as Record<string, unknown>).daily_limit_usdt as number,
    expiresAt: (row as Record<string, unknown>).expires_at as string,
    revoked: (row as Record<string, unknown>).revoked as boolean,
    usedCount: (row as Record<string, unknown>).used_count as number,
  }))
}

export async function recordSessionKeyUsage(
  userSmartWallet: string,
  keyId: string,
  amountUsdt: number
): Promise<void> {
  const db = getSupabaseAdmin()
  if (!db) {
    throw new HttpError('Database not configured', 503)
  }

  const checksumAddress = ethers.getAddress(userSmartWallet)

  await db
    .from('session_key_usage')
    .insert({
      user_smart_wallet: checksumAddress,
      session_key_id: keyId,
      amount_usdt: amountUsdt,
      used_at: new Date().toISOString(),
    })
}

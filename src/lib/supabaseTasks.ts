// KiteDesk | payment replay protection and completed-task rows in Supabase
import { HttpError } from '@/lib/httpError'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

function normalizeHash(hash: string): string {
  return hash.trim().toLowerCase()
}

export type TaskHistoryRow = {
  task_id: string
  task_type: string
  prompt_preview: string
  attestation_url: string
  completed_at: string
}

/** In-process store when Supabase is unset (local dev / single-instance only; not durable across restarts or serverless cold starts). */
const memoryPendingUserByPaymentHash = new Map<string, string>()
const memoryCompletedPaymentHashes = new Set<string>()
const memoryCompletedRowsByUser = new Map<string, TaskHistoryRow[]>()
let loggedMemoryStoreNotice = false

function logMemoryStoreOnce() {
  if (loggedMemoryStoreNotice) return
  loggedMemoryStoreNotice = true
  console.error(
    '[KiteDesk] Using in-memory task store (Supabase unset). OK for local dev; use Supabase in production for replay-safe history.'
  )
}

function claimPaymentTransactionMemory(
  paymentTxHash: string,
  userAddress: string
): void {
  logMemoryStoreOnce()
  const hash = normalizeHash(paymentTxHash)
  const user = userAddress.toLowerCase()
  if (memoryCompletedPaymentHashes.has(hash)) {
    throw new HttpError('Payment already consumed', 400)
  }
  if (memoryPendingUserByPaymentHash.has(hash)) {
    throw new HttpError('Payment already consumed', 400)
  }
  memoryPendingUserByPaymentHash.set(hash, user)
}

function releasePaymentClaimMemory(paymentTxHash: string): void {
  const hash = normalizeHash(paymentTxHash)
  memoryPendingUserByPaymentHash.delete(hash)
}

function completePaymentTaskMemory(
  paymentTxHash: string,
  row: {
    taskId: string
    taskType: string
    promptPreview: string
    attestationUrl: string
  }
): void {
  const hash = normalizeHash(paymentTxHash)
  const user = memoryPendingUserByPaymentHash.get(hash)
  if (!user) {
    throw new HttpError('Task claim out of sync; try again with a new payment', 500)
  }
  memoryPendingUserByPaymentHash.delete(hash)
  memoryCompletedPaymentHashes.add(hash)
  const completedAt = new Date().toISOString()
  const historyRow: TaskHistoryRow = {
    task_id: row.taskId,
    task_type: row.taskType,
    prompt_preview: row.promptPreview,
    attestation_url: row.attestationUrl,
    completed_at: completedAt,
  }
  const list = memoryCompletedRowsByUser.get(user) ?? []
  list.unshift(historyRow)
  memoryCompletedRowsByUser.set(user, list.slice(0, 500))
}

export async function claimPaymentTransaction(
  paymentTxHash: string,
  userAddress: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    claimPaymentTransactionMemory(paymentTxHash, userAddress)
    return
  }
  const hash = normalizeHash(paymentTxHash)
  const { error } = await supabase.from('kitedesk_tasks').insert({
    payment_tx_hash: hash,
    user_address: userAddress.toLowerCase(),
    status: 'pending',
  })
  if (error) {
    if (error.code === '23505') {
      throw new HttpError('Payment already consumed', 400)
    }
    throw new HttpError(error.message || 'Failed to record payment claim', 500)
  }
}

export async function releasePaymentClaim(paymentTxHash: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    releasePaymentClaimMemory(paymentTxHash)
    return
  }
  const hash = normalizeHash(paymentTxHash)
  await supabase
    .from('kitedesk_tasks')
    .delete()
    .eq('payment_tx_hash', hash)
    .eq('status', 'pending')
}

export async function completePaymentTask(
  paymentTxHash: string,
  row: {
    taskId: string
    taskType: string
    promptPreview: string
    attestationUrl: string
  }
): Promise<void> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    completePaymentTaskMemory(paymentTxHash, row)
    return
  }
  const hash = normalizeHash(paymentTxHash)
  const { data, error } = await supabase
    .from('kitedesk_tasks')
    .update({
      status: 'completed',
      task_id: row.taskId,
      task_type: row.taskType,
      prompt_preview: row.promptPreview,
      attestation_url: row.attestationUrl,
      completed_at: new Date().toISOString(),
    })
    .eq('payment_tx_hash', hash)
    .eq('status', 'pending')
    .select('payment_tx_hash')

  if (error) {
    throw new HttpError(error.message || 'Failed to save completed task', 500)
  }
  if (!data?.length) {
    throw new HttpError('Task claim out of sync; try again with a new payment', 500)
  }
}

export async function fetchCompletedTasksForUser(
  userAddress: string,
  limit = 10
): Promise<TaskHistoryRow[]> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    const rows = memoryCompletedRowsByUser.get(userAddress.toLowerCase()) ?? []
    return rows.slice(0, limit)
  }
  const { data, error } = await supabase
    .from('kitedesk_tasks')
    .select('task_id, task_type, prompt_preview, attestation_url, completed_at')
    .eq('user_address', userAddress.toLowerCase())
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as TaskHistoryRow[]
}

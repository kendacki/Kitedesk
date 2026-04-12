// KiteDesk | payment replay protection and completed-task rows in Supabase
import { HttpError } from '@/lib/httpError'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

function normalizeHash(hash: string): string {
  return hash.trim().toLowerCase()
}

export async function claimPaymentTransaction(
  paymentTxHash: string,
  userAddress: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    throw new HttpError(
      'Server storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      503
    )
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
  if (!supabase) return
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
    throw new HttpError(
      'Server storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      503
    )
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

export type TaskHistoryRow = {
  task_id: string
  task_type: string
  prompt_preview: string
  attestation_url: string
  completed_at: string
}

export async function fetchCompletedTasksForUser(
  userAddress: string,
  limit = 10
): Promise<TaskHistoryRow[]> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []
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

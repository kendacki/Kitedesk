// KiteDesk | GET completed tasks for a wallet (Supabase-backed)
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { fetchCompletedTasksForUser } from '@/lib/supabaseTasks'
import type { TaskHistoryEntry, TaskType } from '@/types'

export const runtime = 'nodejs'

const TASK_TYPES: TaskType[] = ['research', 'code_review', 'content_gen', 'goal']

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')?.trim()
  if (!address || !ethers.isAddress(address)) {
    return NextResponse.json({ error: 'Valid address query parameter required' }, { status: 400 })
  }

  const rows = await fetchCompletedTasksForUser(address, 10)
  const entries: TaskHistoryEntry[] = rows
    .filter(
      (r) =>
        r.completed_at &&
        TASK_TYPES.includes(r.task_type as TaskType)
    )
    .map((r) => ({
      taskId: r.task_id,
      taskType: r.task_type as TaskType,
      promptPreview: r.prompt_preview,
      attestationUrl: r.attestation_url,
      completedAt: new Date(r.completed_at).getTime(),
    }))

  return NextResponse.json({ entries })
}

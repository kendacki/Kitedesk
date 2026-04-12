// KiteDesk | recent tasks from Supabase API + browser-local fallback
'use client'

import { useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { TASK_CONFIG } from '@/lib/constants'
import {
  isKnownTaskType,
  mergeTaskHistoryEntries,
  readLocalTaskHistory,
} from '@/lib/taskHistoryLocal'
import type { TaskHistoryEntry, TaskType } from '@/types'

function badgeClass(taskType: TaskType): string {
  switch (taskType) {
    case 'research':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'code_review':
      return 'border-emerald-300 bg-emerald-50 text-emerald-900'
    case 'content_gen':
      return 'border-teal-200 bg-teal-50 text-teal-900'
    case 'goal':
      return 'border-violet-200 bg-violet-50 text-violet-900'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-800'
  }
}

function isSafeExplorerUrl(url: string): boolean {
  const t = url.trim()
  if (!t) return false
  try {
    const u = new URL(t)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

async function fetchHistory(url: string): Promise<{ entries: TaskHistoryEntry[] }> {
  let r: Response
  try {
    r = await fetch(url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    throw new Error(`Could not reach history API: ${msg}`)
  }
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error || 'Failed to load history')
  }
  return r.json() as Promise<{ entries: TaskHistoryEntry[] }>
}

type TaskHistoryProps = {
  userAddress: string | null
  refreshSignal?: number
}

export function TaskHistory({ userAddress, refreshSignal = 0 }: TaskHistoryProps) {
  const key = userAddress
    ? `/api/history?address=${encodeURIComponent(userAddress)}`
    : null

  const { data, error, isLoading, mutate } = useSWR(key, fetchHistory, {
    revalidateOnFocus: true,
    refreshInterval: 10_000,
    dedupingInterval: 5_000,
  })

  useEffect(() => {
    if (userAddress) void mutate()
  }, [refreshSignal, userAddress, mutate])

  const localEntries = useMemo(() => {
    void refreshSignal
    return userAddress ? readLocalTaskHistory(userAddress) : []
  }, [userAddress, refreshSignal])

  const mergedEntries = useMemo(
    () => mergeTaskHistoryEntries(data?.entries ?? [], localEntries),
    [data?.entries, localEntries]
  )

  const showBrowserFallbackHint =
    !isLoading &&
    mergedEntries.length > 0 &&
    localEntries.length > 0 &&
    (error || (Array.isArray(data?.entries) && data.entries.length === 0))

  if (!userAddress) {
    return null
  }

  if (isLoading && !data && mergedEntries.length === 0) {
    return (
      <div className="mt-8">
        <div className="mb-3 h-4 w-28 animate-pulse rounded bg-slate-200" aria-hidden />
        <ul className="space-y-2" aria-busy="true" aria-label="Loading task history">
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-[4.5rem] animate-pulse rounded-xl border border-slate-100 bg-slate-50"
            />
          ))}
        </ul>
      </div>
    )
  }

  if (error && mergedEntries.length === 0) {
    return (
      <div
        className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 font-sans text-sm text-amber-950"
        role="alert"
      >
        Could not load task history. Check that Supabase is configured on the server.
      </div>
    )
  }

  const entries = mergedEntries.filter((e) => isKnownTaskType(e.taskType))

  if (entries.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-4 text-center font-sans text-sm text-slate-500 sm:p-6">
        Completed tasks will appear here with attestation links. They are also saved in
        this browser after each run.
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="mb-3 font-sans text-sm font-semibold text-slate-900">
        Recent tasks
      </h3>
      {showBrowserFallbackHint ? (
        <p className="mb-3 font-sans text-xs text-slate-600" role="status">
          {error
            ? 'Server history unavailable — showing tasks saved in this browser.'
            : 'No server-side history yet — showing tasks saved in this browser. Configure Supabase to sync across devices.'}
        </p>
      ) : null}
      <ul className="space-y-2">
        {entries.map((e) => (
          <li
            key={e.taskId}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span
                className={`shrink-0 rounded-lg border px-2 py-0.5 font-sans text-xs font-medium ${badgeClass(e.taskType)}`}
              >
                {TASK_CONFIG[e.taskType].label}
              </span>
              <span className="min-w-0 max-w-full truncate font-sans text-xs text-slate-600 sm:max-w-md">
                {e.promptPreview}
              </span>
            </div>
            <div className="flex items-center gap-3 font-sans text-xs text-slate-500">
              <span>
                {new Date(e.completedAt).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
              {isSafeExplorerUrl(e.attestationUrl) ? (
                <a
                  href={e.attestationUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-800 transition hover:text-emerald-900 hover:underline"
                >
                  Attestation
                </a>
              ) : (
                <span
                  className="font-medium text-slate-400"
                  title="No valid explorer link"
                >
                  No link
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

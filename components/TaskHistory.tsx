// KiteDesk | recent tasks (light theme)
'use client'

import { useEffect, useState } from 'react'
import { TASK_CONFIG } from '@/lib/constants'
import { readTaskHistory, TASK_HISTORY_KEY } from '@/lib/taskHistory'
import type { TaskHistoryEntry, TaskType } from '@/types'

function badgeClass(taskType: TaskType): string {
  switch (taskType) {
    case 'research':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'code_review':
      return 'border-emerald-300 bg-emerald-50 text-emerald-900'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-800'
  }
}

export function TaskHistory() {
  const [entries, setEntries] = useState<TaskHistoryEntry[]>([])

  useEffect(() => {
    setEntries(readTaskHistory())
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === TASK_HISTORY_KEY) {
        setEntries(readTaskHistory())
      }
    }
    const onLocal = () => setEntries(readTaskHistory())
    window.addEventListener('storage', onStorage)
    window.addEventListener('kitedesk-history', onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('kitedesk-history', onLocal)
    }
  }, [])

  if (entries.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-4 text-center font-sans text-sm text-slate-500 sm:p-6">
        Completed tasks will appear here with attestation links.
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="mb-3 font-sans text-sm font-semibold text-slate-900">Recent tasks</h3>
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
              <span className="min-w-0 max-w-full truncate font-mono text-xs text-slate-600 sm:max-w-md">
                {e.promptPreview}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-slate-500">
              <span>
                {new Date(e.completedAt).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
              <a
                href={e.attestationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-800 transition hover:text-emerald-900 hover:underline"
              >
                Attestation
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

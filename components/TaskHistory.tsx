// KiteDesk | last 10 tasks with attestation links (localStorage)
'use client'

import { useEffect, useState } from 'react'
import { TASK_CONFIG } from '@/lib/constants'
import { readTaskHistory, TASK_HISTORY_KEY } from '@/lib/taskHistory'
import type { TaskHistoryEntry, TaskType } from '@/types'

function badgeClass(taskType: TaskType): string {
  switch (taskType) {
    case 'research':
      return 'bg-kite-bg text-kite-accent border-kite-accent/40'
    case 'code_review':
      return 'bg-kite-bg text-kite-success border-kite-success/40'
    default:
      return 'bg-kite-bg text-kite-muted border-kite-border'
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
      <div className="mt-8 rounded-lg border border-dashed border-kite-border p-6 text-center font-mono text-sm text-kite-muted">
        Completed tasks will appear here with attestation links.
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="mb-3 font-mono text-sm font-medium text-foreground">
        Recent tasks
      </h3>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li
            key={e.taskId}
            className="flex flex-col gap-2 rounded-md border border-kite-border bg-kite-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded border px-2 py-0.5 font-mono text-xs ${badgeClass(e.taskType)}`}
              >
                {TASK_CONFIG[e.taskType].label}
              </span>
              <span className="max-w-[200px] truncate font-mono text-xs text-kite-muted sm:max-w-md">
                {e.promptPreview}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-kite-muted">
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
                className="text-kite-success hover:underline"
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

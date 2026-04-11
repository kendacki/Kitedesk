// KiteDesk | localStorage helpers for recent task attestations
import type { TaskHistoryEntry } from '@/types'

export const TASK_HISTORY_KEY = 'kitedesk-task-history-v1'
const MAX_ENTRIES = 10

export function readTaskHistory(): TaskHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TASK_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TaskHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function appendTaskHistory(entry: TaskHistoryEntry): void {
  if (typeof window === 'undefined') return
  try {
    const prev = readTaskHistory()
    const next = [entry, ...prev].slice(0, MAX_ENTRIES)
    localStorage.setItem(TASK_HISTORY_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('kitedesk-history'))
  } catch {
    // ignore quota / private mode
  }
}

// KiteDesk | browser-local task history backup when Supabase is missing or empty
import type { TaskHistoryEntry, TaskType } from '@/types'

const STORAGE_KEY = 'kitedesk_task_history_v1'
const MAX_PER_USER = 15

const KNOWN_TASK_TYPES: TaskType[] = ['research', 'code_review', 'content_gen', 'goal']
const KNOWN_SET = new Set<string>(KNOWN_TASK_TYPES)

export function isKnownTaskType(t: string): t is TaskType {
  return KNOWN_SET.has(t)
}

type Store = Record<string, TaskHistoryEntry[]>

function parseStore(raw: string | null): Store {
  if (!raw) return {}
  try {
    const j = JSON.parse(raw) as unknown
    if (!j || typeof j !== 'object') return {}
    return j as Store
  } catch {
    return {}
  }
}

function isValidEntry(e: unknown): e is TaskHistoryEntry {
  if (!e || typeof e !== 'object') return false
  const o = e as Record<string, unknown>
  return (
    typeof o.taskId === 'string' &&
    o.taskId.trim().length > 0 &&
    typeof o.taskType === 'string' &&
    isKnownTaskType(o.taskType) &&
    typeof o.promptPreview === 'string' &&
    typeof o.attestationUrl === 'string' &&
    typeof o.completedAt === 'number' &&
    Number.isFinite(o.completedAt)
  )
}

export function readLocalTaskHistory(address: string): TaskHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const key = address.toLowerCase()
  const store = parseStore(window.localStorage.getItem(STORAGE_KEY))
  const list = store[key]
  if (!Array.isArray(list)) return []
  return list.filter(isValidEntry)
}

export function appendLocalTaskHistory(address: string, entry: TaskHistoryEntry): void {
  if (typeof window === 'undefined') return
  const key = address.toLowerCase()
  const store = parseStore(window.localStorage.getItem(STORAGE_KEY))
  const prev = Array.isArray(store[key]) ? store[key].filter(isValidEntry) : []
  const filtered = prev.filter((e) => e.taskId !== entry.taskId)
  const next = [entry, ...filtered].slice(0, MAX_PER_USER)
  store[key] = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* storage full or disabled */
  }
}

/** Prefer server rows; fill gaps from this device only. */
export function mergeTaskHistoryEntries(
  server: TaskHistoryEntry[],
  local: TaskHistoryEntry[]
): TaskHistoryEntry[] {
  const byId = new Map<string, TaskHistoryEntry>()
  for (const e of server) {
    if (e?.taskId && isKnownTaskType(e.taskType)) byId.set(e.taskId, e)
  }
  for (const e of local) {
    if (e?.taskId && isKnownTaskType(e.taskType) && !byId.has(e.taskId)) {
      byId.set(e.taskId, e)
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 20)
}

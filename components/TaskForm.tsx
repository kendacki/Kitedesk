// KiteDesk | task type cards, prompt, pay and run
'use client'

import { useState, type FormEvent } from 'react'
import { TASK_CONFIG } from '@/lib/constants'
import { PriceTag } from '@/components/PriceTag'
import type { TaskType } from '@/types'

const ORDER: TaskType[] = ['research', 'code_review', 'content_gen']

const PLACEHOLDERS: Record<TaskType, string> = {
  research: 'e.g. Latest developments in AI agent payments',
  code_review: 'Paste code to review (any language)',
  content_gen: 'Topic or brief for social and blog content',
}

type TaskFormProps = {
  canSubmit: boolean
  busy: boolean
  onRun: (taskType: TaskType, prompt: string) => void
}

function iconLabel(taskType: TaskType): string {
  switch (taskType) {
    case 'research':
      return 'R'
    case 'code_review':
      return 'C'
    case 'content_gen':
      return 'G'
    default:
      return '?'
  }
}

export function TaskForm({ canSubmit, busy, onRun }: TaskFormProps) {
  const [taskType, setTaskType] = useState<TaskType>('research')
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed || !canSubmit || busy) return
    onRun(taskType, trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-kite-muted">
          Task type
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {ORDER.map((key) => {
            const cfg = TASK_CONFIG[key]
            const selected = taskType === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTaskType(key)}
                disabled={busy}
                className={`rounded-lg border p-4 text-left transition ${
                  selected
                    ? 'border-kite-accent bg-kite-card-hover ring-1 ring-kite-accent/40'
                    : 'border-kite-border bg-kite-bg hover:border-kite-muted'
                } ${busy ? 'opacity-60' : ''}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded border border-kite-border font-mono text-sm text-kite-accent">
                    {iconLabel(key)}
                  </span>
                  <span className="font-mono text-sm font-medium text-foreground">
                    {cfg.label}
                  </span>
                </div>
                <p className="font-mono text-xs leading-relaxed text-kite-muted">
                  {cfg.description}
                </p>
                <p className="mt-2 font-mono text-xs text-kite-usdt">
                  {cfg.priceUsdt.toFixed(2)} USDT
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="prompt"
          className="mb-2 block font-mono text-xs uppercase tracking-widest text-kite-muted"
        >
          Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={busy}
          rows={6}
          placeholder={PLACEHOLDERS[taskType]}
          className="w-full resize-y rounded-lg border border-kite-border bg-kite-bg px-4 py-3 font-mono text-sm text-foreground placeholder:text-kite-muted focus:border-kite-accent focus:outline-none focus:ring-1 focus:ring-kite-accent disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-kite-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <PriceTag taskType={taskType} />
        <button
          type="submit"
          disabled={!canSubmit || busy || !prompt.trim()}
          className="rounded-md bg-kite-accent px-6 py-2.5 font-mono text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Working…' : 'Pay and run agent'}
        </button>
      </div>
    </form>
  )
}

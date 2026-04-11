// KiteDesk | task type cards, prompt, pay and run (brand buttons + landing alignment)
'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { TASK_CONFIG } from '@/lib/constants'
import { PriceTag } from '@/components/PriceTag'
import { brandEase, brandPrimaryButton } from '@/lib/brand'
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
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: brandEase }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
          Task type
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {ORDER.map((key) => {
            const cfg = TASK_CONFIG[key]
            const selected = taskType === key
            return (
              <motion.button
                key={key}
                type="button"
                layout
                onClick={() => setTaskType(key)}
                disabled={busy}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? 'border-emerald-500/60 bg-emerald-950/30 ring-1 ring-emerald-500/40'
                    : 'border-white/10 bg-white/[0.02] hover:border-emerald-700/50'
                } ${busy ? 'opacity-60' : ''}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border font-mono text-sm ${
                      selected
                        ? 'border-emerald-500/50 text-emerald-300'
                        : 'border-white/15 text-emerald-400/80'
                    }`}
                  >
                    {iconLabel(key)}
                  </span>
                  <span className="font-sans text-sm font-semibold text-white">
                    {cfg.label}
                  </span>
                </div>
                <p className="font-sans text-xs leading-relaxed text-slate-400">
                  {cfg.description}
                </p>
                <p className="mt-2 font-mono text-xs text-emerald-400/90">
                  {cfg.priceUsdt.toFixed(2)} USDT
                </p>
              </motion.button>
            )
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="prompt"
          className="mb-2 block font-sans text-xs font-semibold uppercase tracking-widest text-emerald-400/90"
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
          className="min-h-[140px] w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-3 font-mono text-sm text-foreground placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-60 sm:px-4"
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 mt-4 flex flex-col gap-3 border-t border-white/10 bg-zinc-950/90 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:static sm:z-0 sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-white/10 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
        <PriceTag taskType={taskType} />
        <motion.button
          type="submit"
          disabled={!canSubmit || busy || !prompt.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`${brandPrimaryButton} w-full sm:min-h-0 sm:w-auto`}
        >
          {busy ? 'Working…' : 'Pay and run agent'}
        </motion.button>
      </div>
    </motion.form>
  )
}

// KiteDesk | task form with goal-based agent mode
'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { TASK_CONFIG } from '@/lib/constants'
import { PriceTag } from '@/components/PriceTag'
import { TaskTypeIcon } from '@/components/TaskTypeIcons'
import { brandEase, brandPrimaryButton } from '@/lib/brand'
import type { TaskType } from '@/types'

const CLASSIC_ORDER: Array<Exclude<TaskType, 'goal'>> = [
  'research',
  'code_review',
  'content_gen',
]

const CLASSIC_PLACEHOLDERS: Record<Exclude<TaskType, 'goal'>, string> = {
  research: 'e.g. Latest developments in AI agent payments',
  code_review: 'Paste code to review (any language)',
  content_gen: 'Topic or brief for social and blog content',
}

const GOAL_PLACEHOLDER = 'e.g. Find the best GPU under $500 and write a buying guide'

function InfoCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  )
}

function GoalCrosshairIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.5" strokeLinecap="round" />
      <path strokeLinecap="round" d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21" />
    </svg>
  )
}

type ClassicTaskType = Exclude<TaskType, 'goal'>

type TaskFormProps = {
  canSubmit: boolean
  busy: boolean
  onRun: (taskType: ClassicTaskType, prompt: string) => void
  onRunGoal?: (goal: string, budgetUsdt: number) => void
}

export function TaskForm({ canSubmit, busy, onRun, onRunGoal }: TaskFormProps) {
  const [taskType, setTaskType] = useState<TaskType>('research')
  const [prompt, setPrompt] = useState('')
  const [goalText, setGoalText] = useState('')
  const [budgetUsdt, setBudgetUsdt] = useState(0.5)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || busy) return
    if (taskType === 'goal') {
      const g = goalText.trim()
      if (!g || !onRunGoal) return
      onRunGoal(g, budgetUsdt)
      return
    }
    const trimmed = prompt.trim()
    if (!trimmed) return
    onRun(taskType, trimmed)
  }

  const goalSubmitDisabled =
    !canSubmit || busy || !goalText.trim() || (taskType === 'goal' && !onRunGoal)
  const classicSubmitDisabled = !canSubmit || busy || !prompt.trim()
  const submitDisabled =
    taskType === 'goal' ? goalSubmitDisabled : classicSubmitDisabled

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: brandEase }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-emerald-800">
          Task type
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <motion.button
            type="button"
            layout
            onClick={() => setTaskType('goal')}
            disabled={busy}
            whileTap={{ scale: 0.98 }}
            className={`col-span-1 w-full rounded-xl border p-4 text-left transition sm:col-span-2 xl:col-span-4 ${
              taskType === 'goal'
                ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
                : 'border-slate-200 bg-slate-50/80 hover:border-emerald-300'
            } ${busy ? 'opacity-60' : ''}`}
          >
            <div className="relative mb-2 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    taskType === 'goal'
                      ? 'border-emerald-600 bg-white text-emerald-800'
                      : 'border-slate-200 bg-white text-emerald-700'
                  }`}
                >
                  <GoalCrosshairIcon className="h-5 w-5 shrink-0" />
                </span>
                <span className="font-sans text-sm font-semibold text-slate-900">
                  Goal Agent
                </span>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                ⚡ Agentic Commerce
              </span>
            </div>
            <p className="font-sans text-xs leading-relaxed text-slate-600">
              Describe any goal. Agent plans, picks tools, and executes autonomously.
            </p>
            <p className="mt-2 font-mono text-xs font-medium text-emerald-800">
              Pay your budget — agent spends only what&apos;s needed
            </p>
          </motion.button>

          {CLASSIC_ORDER.map((key) => {
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
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
                    : 'border-slate-200 bg-slate-50/80 hover:border-emerald-300'
                } ${busy ? 'opacity-60' : ''}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                      selected
                        ? 'border-emerald-600 bg-white text-emerald-800'
                        : 'border-slate-200 bg-white text-emerald-700'
                    }`}
                  >
                    <TaskTypeIcon taskType={key} />
                  </span>
                  <span className="font-sans text-sm font-semibold text-slate-900">
                    {cfg.label}
                  </span>
                </div>
                <p className="font-sans text-xs leading-relaxed text-slate-600">
                  {cfg.description}
                </p>
                <p className="mt-2 font-mono text-xs font-medium text-emerald-800">
                  {cfg.priceUsdt.toFixed(2)} USDT
                </p>
              </motion.button>
            )
          })}
        </div>
        {taskType === 'goal' ? (
          <p className="mt-3 max-w-3xl font-sans text-xs leading-relaxed text-slate-500">
            Agent autonomously discovers, evaluates, and pays for APIs using x402 protocol — no
            human approval needed
          </p>
        ) : null}
      </div>

      {taskType === 'goal' ? (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="goal-input"
              className="mb-2 block font-sans text-xs font-semibold uppercase tracking-widest text-emerald-800"
            >
              Goal
            </label>
            <div className="mb-3 flex gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
              <InfoCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <p className="font-sans text-xs leading-relaxed text-slate-700">
                Agent pays per API call via x402 — budget is enforced autonomously
              </p>
            </div>
            <textarea
              id="goal-input"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              disabled={busy}
              rows={6}
              placeholder={GOAL_PLACEHOLDER}
              className="min-h-[140px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-60 sm:px-4"
            />
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-sans text-xs font-semibold uppercase tracking-widest text-emerald-800">
                Budget
              </span>
              <span className="font-mono text-sm font-semibold text-slate-900">
                Budget: {budgetUsdt.toFixed(2)} USDT
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.05}
              value={budgetUsdt}
              disabled={busy}
              onChange={(e) => setBudgetUsdt(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer accent-emerald-600 disabled:opacity-60"
              aria-label="Budget in USDT"
            />
            <p className="mt-1 font-sans text-xs text-slate-500">
              Agent will not exceed this amount
            </p>
            <p className="mt-2 font-sans text-xs text-slate-500">~3-5 tool calls</p>
          </div>
        </div>
      ) : (
        <div>
          <label
            htmlFor="prompt"
            className="mb-2 block font-sans text-xs font-semibold uppercase tracking-widest text-emerald-800"
          >
            Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={busy}
            rows={6}
            placeholder={CLASSIC_PLACEHOLDERS[taskType]}
            className="min-h-[140px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-60 sm:px-4"
          />
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-6 mt-4 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm sm:static sm:z-0 sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-slate-200 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
        {taskType === 'goal' ? (
          <div className="font-mono text-sm text-slate-700">
            Pay up to {budgetUsdt.toFixed(2)} USDT for this run
          </div>
        ) : (
          <PriceTag taskType={taskType} />
        )}
        <motion.button
          type="submit"
          disabled={submitDisabled}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`${brandPrimaryButton} w-full sm:min-h-0 sm:w-auto`}
        >
          {busy
            ? 'Working…'
            : taskType === 'goal'
              ? 'Launch Agentic Commerce'
              : 'Pay and run agent'}
        </motion.button>
      </div>
    </motion.form>
  )
}

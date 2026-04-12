// KiteDesk | live timeline: economics + x402 narrative + classic phases
'use client'

import { motion } from 'framer-motion'
import { KitedeskLogoLoader } from '@/components/KitedeskLogoLoader'
import { brandEase } from '@/lib/brand'
import type { ExecutionStatus } from '@/hooks/useTaskExecution'
import type { AgentStep } from '@/types'

type AgentExecutionTimelineProps = {
  status: ExecutionStatus
  isGoalFlow: boolean
  steps: AgentStep[]
  /** Goal-mode USDT budget — drives “cost ≤ remaining” lines in the live trace */
  goalBudgetUsdt?: number
}

const GOAL_NARRATIVE = [
  'Planning execution strategy',
  'Calling paid API (x402 resource)',
  'Received HTTP 402 — payment required',
  'Evaluating: quoted API cost ≤ remaining budget → approve or skip',
  'Approved within cap → settle USDT on Kite testnet (x402)',
  'Retry request with payment proof',
  'Data retrieved (200 OK)',
] as const

const CLASSIC_LABELS: Record<'paying' | 'executing' | 'attesting', string> = {
  paying: '[1] Funding task budget — USDT on Kite testnet',
  executing: '[2] Agent runs: tools, x402 when required, under your cap',
  attesting: '[3] Recording verifiable attestation on Kite chain',
}

function spentUsdtBeforeIndex(steps: AgentStep[], endExclusive: number): number {
  let sum = 0
  const n = Math.min(endExclusive, steps.length)
  for (let i = 0; i < n; i++) {
    const c = steps[i].toolCall?.costUsdt
    if (typeof c === 'number' && Number.isFinite(c)) sum += c
  }
  return sum
}

export function AgentExecutionTimeline({
  status,
  isGoalFlow,
  steps,
  goalBudgetUsdt,
}: AgentExecutionTimelineProps) {
  if (status === 'idle' || status === 'done' || status === 'error') {
    return null
  }

  if (!isGoalFlow) {
    const idx =
      status === 'paying'
        ? 0
        : status === 'executing' || status === 'planning'
          ? 1
          : status === 'attesting'
            ? 2
            : -1
    const keys = ['paying', 'executing', 'attesting'] as const
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: brandEase }}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50 sm:p-6"
        role="status"
        aria-live="polite"
        aria-label="Agent execution timeline"
      >
        <div className="mb-4 flex items-center gap-3">
          <KitedeskLogoLoader size={40} />
          <div>
            <h2 className="font-sans text-sm font-semibold text-slate-900">
              Agent execution timeline
            </h2>
            <p className="font-sans text-xs text-slate-500">
              You fund the run; the agent executes and attests on-chain
            </p>
          </div>
        </div>
        <ol className="space-y-3">
          {keys.map((key, i) => {
            const active = i === idx
            const done = i < idx
            return (
              <li
                key={key}
                className={`flex gap-3 ${active ? 'opacity-100' : 'opacity-55'}`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    done
                      ? 'bg-emerald-600'
                      : active
                        ? 'animate-pulse bg-emerald-500'
                        : 'bg-slate-300'
                  }`}
                />
                <p className="font-sans text-sm text-slate-800">
                  {CLASSIC_LABELS[key]}
                </p>
              </li>
            )
          })}
        </ol>
      </motion.section>
    )
  }

  const goalPhaseIndex =
    status === 'paying'
      ? -1
      : status === 'planning'
        ? 0
        : status === 'executing'
          ? 1
          : status === 'attesting'
            ? 2
            : -1

  const showNarrative =
    status === 'planning' || (status === 'executing' && steps.length === 0)

  const budget =
    typeof goalBudgetUsdt === 'number' &&
    Number.isFinite(goalBudgetUsdt) &&
    goalBudgetUsdt > 0
      ? goalBudgetUsdt
      : null

  const tailStart = steps.length > 6 ? steps.length - 6 : 0
  const tail = steps.slice(tailStart)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: brandEase }}
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50 sm:p-6"
      role="status"
      aria-live="polite"
      aria-label="Agent execution timeline"
    >
      <div className="mb-4 flex items-center gap-3">
        <KitedeskLogoLoader size={40} />
        <div>
          <h2 className="font-sans text-sm font-semibold text-slate-900">
            Agent execution timeline
          </h2>
          <p className="font-sans text-xs text-slate-500">
            Agent pays APIs via x402 when required; every step checked against your
            budget
          </p>
        </div>
      </div>

      <ol className="mb-4 space-y-2 border-b border-slate-100 pb-4">
        <li
          className={`flex gap-3 font-sans text-sm ${
            status === 'paying' ? 'font-medium text-slate-900' : 'text-slate-600'
          }`}
        >
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
              status === 'paying' ? 'animate-pulse bg-emerald-500' : 'bg-emerald-600'
            }`}
          />
          [0] Budget envelope funded — USDT on Kite testnet (your cap for this run)
        </li>
        <li
          className={`flex gap-3 font-sans text-sm ${
            goalPhaseIndex >= 0 ? 'font-medium text-slate-900' : 'text-slate-500'
          }`}
        >
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
              status === 'planning'
                ? 'animate-pulse bg-emerald-500'
                : goalPhaseIndex > 0
                  ? 'bg-emerald-600'
                  : 'bg-slate-300'
            }`}
          />
          Agent is planning… (tool choice and quoted costs)
        </li>
        <li
          className={`flex gap-3 font-sans text-sm ${
            status === 'executing' ? 'font-medium text-slate-900' : 'text-slate-500'
          }`}
        >
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
              status === 'executing'
                ? 'animate-pulse bg-emerald-500'
                : status === 'attesting'
                  ? 'bg-emerald-600'
                  : 'bg-slate-300'
            }`}
          />
          Agent is executing… (evaluates each API cost vs remaining budget before
          paying)
        </li>
        <li
          className={`flex gap-3 font-sans text-sm ${
            status === 'attesting' ? 'font-medium text-slate-900' : 'text-slate-500'
          }`}
        >
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
              status === 'attesting' ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'
            }`}
          />
          Recording verifiable proof on Kite chain
        </li>
      </ol>

      {showNarrative ? (
        <div>
          <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
            Typical x402 tool loop (live steps appear below when tools run)
          </p>
          <ol className="space-y-2">
            {GOAL_NARRATIVE.map((label, i) => (
              <li
                key={label}
                className={`flex gap-2 font-sans text-xs ${
                  i === 0 && status === 'planning' ? 'text-slate-800' : 'text-slate-500'
                }`}
              >
                <span className="w-5 shrink-0 font-mono text-slate-400">{i + 1}.</span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : steps.length > 0 ? (
        <div>
          <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
            Live tool trace ({steps.length} steps)
          </p>
          <ul className="space-y-3">
            {tail.map((s, i) => {
              const globalIdx = tailStart + i
              const tc = s.toolCall
              const isX402Paid = tc?.paymentStatus === 'paid_via_x402'
              const cost =
                typeof tc?.costUsdt === 'number' && Number.isFinite(tc.costUsdt)
                  ? tc.costUsdt
                  : null
              const spentBefore = spentUsdtBeforeIndex(steps, globalIdx)
              const remaining =
                budget !== null ? Math.max(0, budget - spentBefore) : null
              const showEval =
                isX402Paid && cost !== null && remaining !== null && budget !== null

              return (
                <li
                  key={`${s.stepNumber}-${s.completedAt}-${globalIdx}`}
                  className="border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                >
                  {showEval ? (
                    <p className="mb-1.5 rounded-md bg-emerald-50/90 px-2 py-1.5 font-mono text-[11px] leading-snug text-emerald-950 sm:text-xs">
                      Evaluating: cost {cost.toFixed(2)} USDT ≤ remaining budget{' '}
                      {remaining.toFixed(2)} USDT → approved
                    </p>
                  ) : null}
                  <p className="font-sans text-xs text-slate-700">
                    <span className="font-mono text-slate-500">#{s.stepNumber}</span>{' '}
                    {s.description || s.reasoning || tc?.toolName || 'Step'}
                    {isX402Paid ? (
                      <span className="ml-2 text-emerald-700">— paid via x402</span>
                    ) : null}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </motion.section>
  )
}

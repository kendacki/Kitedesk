// KiteDesk | live agent step trace with tool calls and cost breakdown
'use client'

import { motion } from 'framer-motion'
import { brandEase, brandLinkLight } from '@/lib/brand'
import type { AgentStep, ToolName } from '@/types'

export interface AgentStepsPanelProps {
  steps: AgentStep[]
  totalSpentUsdt: number
  budgetUsdt: number
  isRunning: boolean
  finalOutput?: string
  attestationUrl?: string
}

function toolBadgeClass(toolName: ToolName): string {
  switch (toolName) {
    case 'web_search':
      return 'border-blue-200 bg-blue-50 text-blue-900'
    case 'price_check':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'summarize':
      return 'border-violet-200 bg-violet-50 text-violet-900'
    case 'competitor_analysis':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'news_fetch':
      return 'border-sky-200 bg-sky-50 text-sky-900'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-800'
  }
}

function formatUsdt(n: number): string {
  return n.toFixed(2)
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function aggregateToolCosts(steps: AgentStep[]): { tool: ToolName; calls: number; cost: number }[] {
  const map = new Map<ToolName, { calls: number; cost: number }>()
  for (const step of steps) {
    const tc = step.toolCall
    if (!tc) continue
    const prev = map.get(tc.toolName) ?? { calls: 0, cost: 0 }
    map.set(tc.toolName, {
      calls: prev.calls + 1,
      cost: prev.cost + tc.costUsdt,
    })
  }
  return Array.from(map.entries())
    .map(([tool, v]) => ({ tool, calls: v.calls, cost: v.cost }))
    .sort((a, b) => a.tool.localeCompare(b.tool))
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: brandEase },
  },
}

export function AgentStepsPanel({
  steps,
  totalSpentUsdt,
  budgetUsdt,
  isRunning,
  finalOutput,
  attestationUrl,
}: AgentStepsPanelProps) {
  const pct =
    budgetUsdt > 0 ? Math.min(100, Math.round((totalSpentUsdt / budgetUsdt) * 1000) / 10) : 0
  const saved = Math.max(0, budgetUsdt - totalSpentUsdt)
  const rows = aggregateToolCosts(steps)
  const tableTotal = rows.reduce((s, r) => s + r.cost, 0)

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50 sm:p-6">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h3 className="font-sans text-sm font-semibold text-slate-900">Agent execution trace</h3>
        <div className="mt-3">
          <div className="mb-1 flex justify-between font-mono text-xs text-slate-600 sm:text-sm">
            <span>
              Spent {formatUsdt(totalSpentUsdt)} USDT of {formatUsdt(budgetUsdt)} budget
            </span>
            <span>{pct}%</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Budget used"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {isRunning && steps.length === 0 ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span
            className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500"
            aria-hidden
          />
          <span className="font-sans text-sm text-slate-600">Agent thinking…</span>
        </div>
      ) : null}

      <motion.ol
        className="space-y-3"
        variants={listVariants}
        initial="hidden"
        animate="show"
        key={steps.map((s) => s.stepNumber).join('-') || 'empty'}
      >
        {steps.map((step) => (
          <motion.li
            key={`${step.stepNumber}-${step.completedAt}`}
            variants={rowVariants}
            className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-start gap-2 sm:gap-3">
              <span className="inline-flex min-w-[2rem] justify-center rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                {String(step.stepNumber).padStart(2, '0')}
              </span>
              {step.toolCall ? (
                <span
                  className={`inline-flex rounded-lg border px-2 py-0.5 font-mono text-xs font-medium ${toolBadgeClass(step.toolCall.toolName)}`}
                >
                  {step.toolCall.toolName}
                </span>
              ) : (
                <span className="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs text-slate-600">
                  —
                </span>
              )}
            </div>
            <p className="mt-2 font-sans text-xs leading-relaxed text-slate-500">{step.reasoning}</p>
            {step.toolCall ? (
              <p className="mt-1 font-mono text-xs text-slate-500">
                Input: {truncate(step.toolCall.input, 60)}
              </p>
            ) : null}
            {step.toolCall ? (
              <div className="mt-2 flex flex-wrap gap-3 font-mono text-xs">
                <span className="font-medium text-emerald-800">
                  {formatUsdt(step.toolCall.costUsdt)} USDT
                </span>
                <span className="text-slate-400">
                  {(step.toolCall.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
            ) : null}
          </motion.li>
        ))}
      </motion.ol>

      {finalOutput ? (
        <div className="mt-6">
          <h4 className="mb-2 font-sans text-xs font-semibold uppercase tracking-widest text-emerald-800">
            Final output
          </h4>
          <pre className="max-h-[min(50dvh,480px)] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 sm:max-h-[min(60vh,480px)] sm:p-4 sm:text-sm">
            {finalOutput}
          </pre>
        </div>
      ) : null}

      {steps.length > 0 ? (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-slate-600">
            Cost summary
          </h4>
          {rows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[280px] border-collapse font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-3 py-2 font-semibold">Tool</th>
                    <th className="px-3 py-2 font-semibold">Calls</th>
                    <th className="px-3 py-2 font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.tool} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 text-slate-900">{r.tool}</td>
                      <td className="px-3 py-2 text-slate-600">{r.calls}</td>
                      <td className="px-3 py-2 text-emerald-800">${formatUsdt(r.cost)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-3 py-2 text-slate-900">Total</td>
                    <td className="px-3 py-2 text-slate-600" />
                    <td className="px-3 py-2 text-emerald-900">${formatUsdt(tableTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="mt-3 font-sans text-sm text-slate-600">
            Saved {formatUsdt(saved)} USDT from your budget
          </p>
        </div>
      ) : null}

      {attestationUrl ? (
        <div className="mt-4">
          <a
            href={attestationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${brandLinkLight} font-mono text-sm`}
          >
            View attestation on Kite Explorer
          </a>
        </div>
      ) : null}
    </div>
  )
}

// KiteDesk | live agent step trace with tool calls and cost breakdown
'use client'

import { motion } from 'framer-motion'
import { AgentMarkdown } from '@/components/AgentMarkdown'
import { brandEase, brandLinkLight } from '@/lib/brand'
import type { AgentStep, ToolCall, ToolName } from '@/types'

const KITE_TESTNET_TX_BASE = 'https://testnet.kitescan.ai/tx'

export interface AgentStepsPanelProps {
  steps: AgentStep[]
  totalSpentUsdt: number
  budgetUsdt: number
  isRunning: boolean
  finalOutput?: string
  attestationUrl?: string
  planReasoning?: string
  skippedTools?: string[]
  budgetSavings?: number
  x402PaymentsCount?: number
  x402TotalPaidUsdt?: number
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
    case 'deep_read':
      return 'border-indigo-200 bg-indigo-50 text-indigo-900'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-800'
  }
}

function formatUsdt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function safeCost(n: number | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

function truncate(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s : s == null ? '' : String(s)
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

type SourceLink = { title: string; url: string }

function extractSourceLinks(output: string): SourceLink[] | null {
  try {
    const j = JSON.parse(output) as Record<string, unknown>
    const key = (['results', 'articles', 'sources'] as const).find((k) =>
      Array.isArray(j[k])
    )
    if (!key) return null
    const arr = j[key] as Array<{ title?: string; url?: string }>
    const out: SourceLink[] = []
    for (const item of arr.slice(0, 3)) {
      if (item?.url && typeof item.url === 'string') {
        out.push({
          title: typeof item.title === 'string' ? item.title : item.url,
          url: item.url,
        })
      }
    }
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}

function aggregateToolCosts(
  steps: AgentStep[]
): { tool: ToolName; calls: number; cost: number }[] {
  const map = new Map<ToolName, { calls: number; cost: number }>()
  for (const step of steps) {
    const tc = step.toolCall
    if (!tc) continue
    const prev = map.get(tc.toolName) ?? { calls: 0, cost: 0 }
    const add = safeCost(tc.costUsdt)
    map.set(tc.toolName, {
      calls: prev.calls + 1,
      cost: prev.cost + add,
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

function X402PaymentBadge({
  paymentStatus,
  x402TxHash,
}: {
  paymentStatus?: ToolCall['paymentStatus']
  x402TxHash?: string
}) {
  if (paymentStatus === 'free' || paymentStatus === undefined) {
    return null
  }
  if (paymentStatus === 'budget_exceeded') {
    return (
      <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-sans text-[10px] font-medium text-amber-900 sm:text-xs">
        {'\u26A0'} Skipped — budget limit
      </span>
    )
  }
  if (paymentStatus === 'paid_via_x402') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-100 px-2 py-0.5 font-sans text-[10px] font-semibold text-emerald-900 sm:text-xs">
          {'\u2713'} Paid via x402
        </span>
        {x402TxHash ? (
          <a
            href={`${KITE_TESTNET_TX_BASE}/${x402TxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[10px] text-emerald-800 underline decoration-emerald-300 hover:text-emerald-950 sm:text-xs"
          >
            {truncate(x402TxHash, 22)}
          </a>
        ) : null}
      </div>
    )
  }
  return null
}

function X402FlowSequence() {
  const labels = [
    'Hit 402 Paywall',
    'Evaluated Cost',
    'Paid via x402',
    'Got Result',
  ] as const
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 font-sans text-[10px] sm:text-xs"
      role="list"
      aria-label="x402 payment flow"
    >
      {labels.map((label, i) => (
        <span key={label} className="inline-flex items-center gap-1" role="listitem">
          {i > 0 ? (
            <span className="px-0.5 font-medium text-emerald-600" aria-hidden>
              →
            </span>
          ) : null}
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
            {label}
          </span>
        </span>
      ))}
    </div>
  )
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5a3 3 0 0 0-3 3v1a4 4 0 0 0-3.2 6.4A4 4 0 0 0 9 20h.5a3 3 0 0 0 2.5-1.3A3 3 0 0 0 15 20h.5a4 4 0 0 0 3.2-4.6A4 4 0 0 0 15 9V8a3 3 0 0 0-3-3z" />
      <path d="M9 12h.01M15 12h.01" />
    </svg>
  )
}

export function AgentStepsPanel({
  steps,
  totalSpentUsdt,
  budgetUsdt,
  isRunning,
  finalOutput,
  attestationUrl,
  planReasoning,
  skippedTools,
  budgetSavings,
  x402PaymentsCount,
  x402TotalPaidUsdt,
}: AgentStepsPanelProps) {
  const budget = Number.isFinite(budgetUsdt) ? budgetUsdt : 0
  const spent = Number.isFinite(totalSpentUsdt) ? totalSpentUsdt : 0
  const pct =
    budget > 0
      ? Math.min(100, Math.round((spent / budget) * 1000) / 10)
      : 0
  const saved = Math.max(0, budget - spent)
  const rows = aggregateToolCosts(steps)
  const tableTotal = rows.reduce((s, r) => s + r.cost, 0)
  const savings =
    typeof budgetSavings === 'number' && Number.isFinite(budgetSavings)
      ? Math.max(0, budgetSavings)
      : saved

  const showX402CommerceBanner = steps.some(
    (s) => s.toolCall?.paymentStatus === 'paid_via_x402'
  )

  let runningCost = 0

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50 sm:p-6">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h3 className="font-sans text-sm font-semibold text-slate-900">
          Agent execution trace
        </h3>
        {showX402CommerceBanner ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-sans text-xs leading-snug text-emerald-800">
            Agent autonomously handled API payments via x402 protocol
          </p>
        ) : null}
        <div className="mt-3">
          <div className="mb-1 flex justify-between font-sans text-xs text-slate-600 sm:text-sm">
            <span>
              Spent {formatUsdt(spent)} USDT of {formatUsdt(budget)} budget
            </span>
            <span>{pct}%</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Budget used"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
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

      {planReasoning ? (
        <div className="mb-4 flex gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
          <BrainIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="font-sans text-xs italic leading-relaxed text-slate-500">
            <span className="font-semibold not-italic text-slate-600">Strategy: </span>
            {planReasoning}
          </p>
        </div>
      ) : null}

      <motion.ol
        className="space-y-3"
        variants={listVariants}
        initial="hidden"
        animate="show"
        key={steps.map((s) => s.stepNumber).join('-') || 'empty'}
      >
        {steps.map((step) => {
          runningCost += safeCost(step.toolCall?.costUsdt)
          const sources =
            step.toolCall?.output && step.toolCall.toolName !== 'summarize'
              ? extractSourceLinks(step.toolCall.output)
              : null
          return (
            <motion.li
              key={`${step.stepNumber}-${step.completedAt}`}
              variants={rowVariants}
              className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start gap-2 sm:gap-3">
                <span className="inline-flex min-w-[2rem] justify-center rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-sans text-xs font-semibold text-slate-700">
                  {String(step.stepNumber).padStart(2, '0')}
                </span>
                {step.toolCall ? (
                  <span
                    className={`inline-flex rounded-lg border px-2 py-0.5 font-sans text-xs font-medium ${toolBadgeClass(step.toolCall.toolName)}`}
                  >
                    {step.toolCall.toolName}
                  </span>
                ) : (
                  <span className="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-sans text-xs text-slate-600">
                    —
                  </span>
                )}
                {step.stepKind === 'x402_payment' ? (
                  <span className="inline-flex rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-0.5 font-sans text-xs font-medium text-cyan-900">
                    x402 payment
                  </span>
                ) : null}
              </div>
              {step.toolCall?.paymentStatus === 'paid_via_x402' ? <X402FlowSequence /> : null}
              {step.toolCall &&
              (step.toolCall.paymentStatus === 'paid_via_x402' ||
                step.toolCall.paymentStatus === 'budget_exceeded') ? (
                <div className="mt-2">
                  <X402PaymentBadge
                    paymentStatus={step.toolCall.paymentStatus}
                    x402TxHash={step.toolCall.x402TxHash}
                  />
                </div>
              ) : null}
              <p className="mt-2 font-sans text-xs leading-relaxed text-slate-500">
                {step.reasoning}
              </p>
              {step.toolCall ? (
                <p className="mt-1 font-sans text-xs text-slate-500">
                  Input: {truncate(step.toolCall.input, 60)}
                </p>
              ) : null}
              {step.toolCall ? (
                <div className="mt-2 flex flex-wrap gap-3 font-sans text-xs">
                  <span className="font-medium text-emerald-800">
                    {formatUsdt(safeCost(step.toolCall.costUsdt))} USDT
                  </span>
                  <span className="text-slate-400">
                    {((step.toolCall.durationMs ?? 0) / 1000).toFixed(1)}s
                  </span>
                </div>
              ) : null}
              {step.toolCall?.output && step.toolCall.toolName !== 'summarize' ? (
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-2 font-sans text-[10px] text-slate-700 sm:text-xs">
                  {truncate(step.toolCall.output, 600)}
                </pre>
              ) : null}
              {sources && sources.length > 0 ? (
                <div className="mt-2 border-t border-slate-200/80 pt-2">
                  <p className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Sources
                  </p>
                  <ul className="flex flex-col gap-1">
                    {sources.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-xs text-slate-400 hover:text-slate-600 hover:underline"
                        >
                          ↗ {truncate(s.title, 50)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="mt-2 font-sans text-[10px] text-slate-400 sm:text-xs">
                Running total: {formatUsdt(runningCost)} USDT
              </p>
            </motion.li>
          )
        })}
      </motion.ol>

      {skippedTools && skippedTools.length > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-sans text-xs text-amber-800">
          {`Agent skipped ${skippedTools.join(', ')} to stay within budget — saved $${savings.toFixed(2)} USDT`}
        </div>
      ) : null}

      {finalOutput ? (
        <div className="mt-6">
          <h4 className="mb-2 font-sans text-xs font-semibold uppercase tracking-widest text-emerald-800">
            Final output
          </h4>
          <AgentMarkdown content={finalOutput} />
        </div>
      ) : null}

      {steps.length > 0 ? (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-slate-600">
            Cost summary
          </h4>
          {rows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[280px] border-collapse font-sans text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-3 py-2 font-semibold">Tool</th>
                    <th className="px-3 py-2 font-semibold">Calls</th>
                    <th className="px-3 py-2 font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.tool}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-2 text-slate-900">{r.tool}</td>
                      <td className="px-3 py-2 text-slate-600">{r.calls}</td>
                      <td className="px-3 py-2 text-emerald-800">
                        ${formatUsdt(r.cost)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-3 py-2 text-slate-900">Total</td>
                    <td className="px-3 py-2 text-slate-600" />
                    <td className="px-3 py-2 text-emerald-900">
                      ${formatUsdt(tableTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
          {typeof x402PaymentsCount === 'number' &&
          typeof x402TotalPaidUsdt === 'number' &&
          Number.isFinite(x402PaymentsCount) &&
          Number.isFinite(x402TotalPaidUsdt) ? (
            <p className="mt-3 font-sans text-sm text-slate-700">
              x402 payments: {x402PaymentsCount} calls,{' '}
              {x402TotalPaidUsdt.toFixed(4)} USDT paid autonomously
            </p>
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
            className={`${brandLinkLight} font-sans text-sm`}
          >
            View attestation on Kite Explorer
          </a>
        </div>
      ) : null}
    </div>
  )
}

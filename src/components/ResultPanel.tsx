// KiteDesk | agent output + verifiable execution + explorer links (light theme)
'use client'

import { motion } from 'framer-motion'
import { AgentMarkdown } from '@/components/AgentMarkdown'
import { KITE_CHAIN } from '@/lib/constants'
import {
  brandEase,
  brandLinkLight,
  brandPrimaryButton,
  brandSecondaryButtonLight,
} from '@/lib/brand'
import type { TaskResult } from '@/types'

type ResultPanelProps = {
  result: TaskResult
  onReset: () => void
  /** Fixed-price classic task: show per-task USDT cost breakdown */
  classicCost?: { taskLabel: string; priceUsdt: number }
}

function isSafeHttpUrl(url: string): boolean {
  const t = url.trim()
  if (!t) return false
  try {
    const u = new URL(t)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash.trim())
}

export function ResultPanel({ result, onReset, classicCost }: ResultPanelProps) {
  const base = KITE_CHAIN.explorerUrl.replace(/\/$/, '')
  const payUrl = isValidTxHash(result.txHash)
    ? `${base}/tx/${result.txHash.trim()}`
    : ''
  const attestUrl = result.attestationUrl
  const primaryExplorer = isSafeHttpUrl(result.attestationUrl)
    ? result.attestationUrl.trim()
    : payUrl
  const hasPrimaryExplorer = isSafeHttpUrl(primaryExplorer)

  const attestShort =
    result.attestationHash && result.attestationHash.length > 12
      ? `${result.attestationHash.slice(0, 10)}…${result.attestationHash.slice(-6)}`
      : result.attestationHash || '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: brandEase }}
      className="mt-6 space-y-6"
    >
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
        <h3 className="font-sans text-sm font-semibold text-emerald-950">
          Verifiable execution on Kite
        </h3>
        <ul className="mt-3 space-y-2 font-sans text-xs text-emerald-950/90 sm:text-sm">
          <li className="flex gap-2">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
              aria-hidden
            />
            <span>Payment and outcome tied to your wallet on Kite testnet</span>
          </li>
          <li className="flex gap-2">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
              aria-hidden
            />
            <span>Result commitment recorded on-chain (attestation)</span>
          </li>
          <li className="flex gap-2">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
              aria-hidden
            />
            <span>
              Attestation ref:{' '}
              <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[11px] text-slate-800">
                {attestShort}
              </code>
            </span>
          </li>
        </ul>
        {hasPrimaryExplorer ? (
          <a
            href={primaryExplorer}
            target="_blank"
            rel="noopener noreferrer"
            className={`${brandPrimaryButton} mt-4 inline-flex w-full justify-center sm:w-auto`}
          >
            View on Explorer
          </a>
        ) : (
          <p className="mt-4 font-sans text-xs text-emerald-900/80">
            Explorer link unavailable — check payment hash and attestation URL in your
            records.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-2 font-sans text-xs sm:flex-row sm:flex-wrap sm:gap-x-4">
          {payUrl ? (
            <a
              href={payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={brandLinkLight}
            >
              Payment transaction
            </a>
          ) : (
            <span className="text-slate-400">Payment transaction link unavailable</span>
          )}
          {isSafeHttpUrl(attestUrl) ? (
            <a
              href={attestUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-900 underline-offset-2 hover:underline"
            >
              Attestation transaction
            </a>
          ) : (
            <span className="text-slate-400">Attestation link unavailable</span>
          )}
        </div>
      </div>

      {classicCost ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="font-sans text-sm font-semibold text-slate-900">
            Cost breakdown
          </h3>
          <dl className="mt-3 grid gap-2 font-sans text-sm text-slate-700 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Task
              </dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {classicCost.taskLabel}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Paid (USDT)
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {classicCost.priceUsdt.toFixed(2)} USDT
              </dd>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Model
              </dt>
              <dd className="mt-0.5 text-slate-800">Fixed-price autonomous run</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50 sm:p-6">
        <h3 className="mb-3 font-sans text-sm font-semibold text-slate-900">Result</h3>
        <AgentMarkdown content={result.output} />
        <motion.button
          type="button"
          onClick={onReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`${brandSecondaryButtonLight} mt-6`}
        >
          Run another task
        </motion.button>
      </div>
    </motion.div>
  )
}

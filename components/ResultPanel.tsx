// KiteDesk | agent output + explorer links (light theme)
'use client'

import { motion } from 'framer-motion'
import { AgentMarkdown } from '@/components/AgentMarkdown'
import { KITE_CHAIN } from '@/lib/constants'
import { brandEase, brandLinkLight, brandSecondaryButtonLight } from '@/lib/brand'
import type { TaskResult } from '@/types'

type ResultPanelProps = {
  result: TaskResult
  onReset: () => void
}

export function ResultPanel({ result, onReset }: ResultPanelProps) {
  const payUrl = `${KITE_CHAIN.explorerUrl.replace(/\/$/, '')}/tx/${result.txHash}`
  const attestUrl = result.attestationUrl

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: brandEase }}
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50 sm:p-6"
    >
      <h3 className="mb-3 font-sans text-sm font-semibold text-slate-900">Result</h3>
      <AgentMarkdown content={result.output} />
      <div className="mt-4 flex flex-col gap-2 font-sans text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:text-sm">
        <a
          href={payUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${brandLinkLight}`}
        >
          View payment on Kite Explorer
        </a>
        <a
          href={attestUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-800 transition hover:text-emerald-900 hover:underline"
        >
          View attestation on Kite Explorer
        </a>
      </div>
      <motion.button
        type="button"
        onClick={onReset}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`${brandSecondaryButtonLight} mt-6`}
      >
        Run another task
      </motion.button>
    </motion.div>
  )
}

// KiteDesk | agent output + explorer links (light theme)
'use client'

import { motion } from 'framer-motion'
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
      <pre className="max-h-[min(50dvh,480px)] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 sm:max-h-[min(60vh,480px)] sm:p-4 sm:text-sm">
        {result.output}
      </pre>
      <div className="mt-4 flex flex-col gap-2 font-mono text-xs sm:flex-row sm:flex-wrap sm:text-sm">
        <a
          href={payUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${brandLinkLight}`}
        >
          View payment on Kite Explorer
        </a>
        <span className="hidden text-slate-400 sm:inline">|</span>
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

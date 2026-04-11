// KiteDesk | agent output and explorer links for payment + attestation
'use client'

import { KITE_CHAIN } from '@/lib/constants'
import type { TaskResult } from '@/types'

type ResultPanelProps = {
  result: TaskResult
  onReset: () => void
}

export function ResultPanel({ result, onReset }: ResultPanelProps) {
  const payUrl = `${KITE_CHAIN.explorerUrl.replace(/\/$/, '')}/tx/${result.txHash}`
  const attestUrl = result.attestationUrl

  return (
    <div className="mt-6 rounded-lg border border-kite-border bg-kite-bg p-6">
      <h3 className="mb-3 font-mono text-sm font-medium text-foreground">Result</h3>
      <pre className="max-h-[min(60vh,480px)] overflow-auto whitespace-pre-wrap rounded border border-kite-border bg-kite-card p-4 font-mono text-sm text-foreground">
        {result.output}
      </pre>
      <div className="mt-4 flex flex-col gap-2 font-mono text-sm sm:flex-row sm:flex-wrap">
        <a
          href={payUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-kite-accent hover:underline"
        >
          View payment on Kite Explorer
        </a>
        <span className="hidden text-kite-muted sm:inline">|</span>
        <a
          href={attestUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-kite-success hover:underline"
        >
          View attestation on Kite Explorer
        </a>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 rounded-md border border-kite-border bg-kite-card-hover px-4 py-2 font-mono text-sm text-foreground transition hover:border-kite-accent"
      >
        Run another task
      </button>
    </div>
  )
}

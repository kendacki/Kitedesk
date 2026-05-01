'use client'

import { useEffect, useState } from 'react'
type FundingState = {
  status: 'pending' | 'success' | 'failed' | 'skipped' | null
  txHash?: string | null
  error?: string | null
  note?: string | null
}

export function SessionKeyFundingStatus({ address }: { address: string | null }) {
  const [state, setState] = useState<FundingState>({ status: null })

  useEffect(() => {
    if (!address || typeof window === 'undefined') {
      setState({ status: null })
      return
    }
    const key = `session-key-funding-${address}`
    try {
      const raw = localStorage.getItem(key)
      if (!raw) {
        setState({ status: null })
        return
      }
      const parsed = JSON.parse(raw) as FundingState
      setState(parsed)
    } catch {
      setState({ status: null })
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== key) return
      try {
        const parsed = ev.newValue ? JSON.parse(ev.newValue) : null
        setState(parsed ?? { status: null })
      } catch {
        setState({ status: null })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [address])

  if (!address) return null

  const { status, error, note } = state

  if (!status) return null

  return (
    <div className="mt-2 flex w-full items-center gap-2 text-xs text-slate-700 sm:justify-end">
      {status === 'pending' && <span>{note || 'Session key funding: Pending…'}</span>}
      {status === 'success' && (
        <span>Session key funding complete</span>
      )}
      {status === 'skipped' && <span>{note || 'Session key funding skipped (wrong network)'}</span>}
      {status === 'failed' && (
        <span>{note || `Session key funding failed: ${String(error ?? 'unknown')}`}</span>
      )}
    </div>
  )
}

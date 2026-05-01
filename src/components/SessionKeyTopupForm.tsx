'use client'

import { useState } from 'react'
import { KITE_CHAIN } from '@/lib/constants'

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error'

export function SessionKeyTopupForm({
  address,
  keyId,
}: {
  address: string | null
  keyId: string | null
}) {
  const [txHash, setTxHash] = useState('')
  const [state, setState] = useState<SubmissionState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [resultTxHash, setResultTxHash] = useState<string | null>(null)

  const isReady = address && keyId && txHash.trim().length > 0

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!address || !keyId || !isReady) return

    setState('submitting')
    setMessage(null)
    setResultTxHash(null)

    try {
      const response = await fetch('/api/session-keys/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSmartWallet: address,
          keyId,
          txHash: txHash.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setState('error')
        setMessage(data.error || 'Verification failed')
        return
      }

      setState('success')
      setMessage(`Top-up verified! Transferred: ${data.amountUsdt?.toFixed(2) || '?'} USDT`)
      setResultTxHash(data.txHash)
      setTxHash('')
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Submission failed')
    }
  }

  if (!address || !keyId) {
    return null
  }

  return (
    <div className="mt-4 w-full rounded border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <h3 className="text-sm font-semibold text-slate-900">Manual Top-Up Verification</h3>
      <p className="mt-1 text-xs text-slate-600">
        If you funded the session key externally, submit the transaction hash for server verification.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        <input
          type="text"
          placeholder="0x..."
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          disabled={state === 'submitting'}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={!isReady || state === 'submitting'}
          className="self-end rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:bg-slate-300 hover:bg-blue-700"
        >
          {state === 'submitting' ? 'Verifying...' : 'Verify Top-Up'}
        </button>
      </form>

      {state === 'success' && resultTxHash && (
        <div className="mt-3 flex flex-col gap-1 rounded bg-green-50 p-2 text-xs text-green-800">
          <span className="font-semibold">✓ Top-up verified</span>
          <span>{message}</span>
          <a
            className="underline"
            href={`${KITE_CHAIN.explorerUrl}/tx/${resultTxHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on explorer
          </a>
        </div>
      )}

      {state === 'error' && (
        <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-800">
          <span className="font-semibold">✗ Verification failed</span>
          <p className="mt-1">{message}</p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'

type DebugStatus = 'loading' | 'active' | 'revoked' | 'missing'

type SessionListResponse = {
  keys?: Array<{ keyId?: string; key_id?: string }>
}

function normalizeAddress(address: string): string {
  try {
    return ethers.getAddress(address)
  } catch {
    return address
  }
}

function truncateKeyId(keyId: string): string {
  if (keyId.length <= 14) return keyId
  return `${keyId.slice(0, 10)}...${keyId.slice(-4)}`
}

export function SessionKeyDebugStatus({ address }: { address: string | null }) {
  const [status, setStatus] = useState<DebugStatus>('loading')
  const [localKeyId, setLocalKeyId] = useState<string | null>(null)
  const [backendKeyId, setBackendKeyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isEnabled = process.env.NODE_ENV !== 'production'

  const refresh = useCallback(async () => {
    if (!isEnabled || !address || typeof window === 'undefined') return

    const normalizedAddress = normalizeAddress(address)
    const localId = localStorage.getItem(`session-key-${normalizedAddress}`)
    setLocalKeyId(localId)
    setError(null)
    setStatus('loading')

    try {
      const res = await fetch(
        `/api/session-keys/list?wallet=${encodeURIComponent(normalizedAddress)}`
      )
      if (!res.ok) {
        setStatus(localId ? 'revoked' : 'missing')
        setError(`list API ${res.status}`)
        setBackendKeyId(null)
        return
      }

      const data = (await res.json()) as SessionListResponse
      const first = Array.isArray(data.keys) ? data.keys[0] : null
      const activeKeyId =
        typeof first?.keyId === 'string'
          ? first.keyId
          : typeof first?.key_id === 'string'
            ? first.key_id
            : null

      setBackendKeyId(activeKeyId)

      if (localId && activeKeyId && localId === activeKeyId) {
        setStatus('active')
        return
      }

      if (!localId && !activeKeyId) {
        setStatus('missing')
        return
      }

      setStatus('revoked')
    } catch (err) {
      setBackendKeyId(null)
      setStatus(localId ? 'revoked' : 'missing')
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [address, isEnabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const styles = useMemo(() => {
    if (status === 'active') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }
    if (status === 'missing') {
      return 'border-slate-200 bg-slate-50 text-slate-700'
    }
    if (status === 'loading') {
      return 'border-blue-200 bg-blue-50 text-blue-800'
    }
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }, [status])

  if (!isEnabled || !address) {
    return null
  }

  return (
    <div className={`w-full rounded-lg border px-3 py-2 text-xs sm:max-w-md ${styles}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide">Session Key Debug</span>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded border border-current px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        >
          Refresh
        </button>
      </div>
      <div className="mt-1">
        <span className="font-medium">Status:</span>{' '}
        {status === 'loading' && 'loading'}
        {status === 'active' && 'active'}
        {status === 'missing' && 'missing'}
        {status === 'revoked' && 'revoked/mismatch'}
      </div>
      <div className="mt-1 break-all">
        <span className="font-medium">Local key:</span>{' '}
        {localKeyId ? truncateKeyId(localKeyId) : 'none'}
      </div>
      <div className="mt-1 break-all">
        <span className="font-medium">Backend key:</span>{' '}
        {backendKeyId ? truncateKeyId(backendKeyId) : 'none'}
      </div>
      {error ? <div className="mt-1 break-all">Error: {error}</div> : null}
    </div>
  )
}

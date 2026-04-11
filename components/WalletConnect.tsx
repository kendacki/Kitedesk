// KiteDesk | MetaMask connect, USDT balance, Kite chain indicator, disconnect on hover
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ethers } from 'ethers'
import { checkUsdtBalance } from '@/lib/payment'

function truncateAddress(address: string): string {
  if (address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export type WalletConnectProps = {
  address: string | null
  provider: ethers.BrowserProvider | null
  connect: () => Promise<void>
  disconnect: () => void
  isConnecting: boolean
  error: string | null
}

export function WalletConnect({
  address,
  provider,
  connect,
  disconnect,
  isConnecting,
  error,
}: WalletConnectProps) {
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null)
  const [balancePending, setBalancePending] = useState(false)
  const [copyDone, setCopyDone] = useState(false)

  const refreshBalance = useCallback(async () => {
    if (!provider || !address) {
      setUsdtBalance(null)
      return
    }
    setBalancePending(true)
    try {
      const bal = await checkUsdtBalance(provider, address)
      setUsdtBalance(bal)
    } catch {
      setUsdtBalance(null)
    } finally {
      setBalancePending(false)
    }
  }, [provider, address])

  useEffect(() => {
    void refreshBalance()
  }, [refreshBalance])

  useEffect(() => {
    if (!provider || !address) return
    const t = setInterval(() => {
      void refreshBalance()
    }, 20000)
    return () => clearInterval(t)
  }, [provider, address, refreshBalance])

  const copyAddress = useCallback(async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 2000)
    } catch {
      setCopyDone(false)
    }
  }, [address])

  if (!address) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => void connect()}
          disabled={isConnecting}
          className="rounded-md border border-kite-border bg-kite-card-hover px-4 py-2 font-mono text-sm text-foreground transition hover:border-kite-accent hover:text-kite-accent disabled:opacity-50"
        >
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
        {error ? (
          <p className="max-w-xs text-right text-xs text-[var(--accent-danger)]">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col items-end gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2 font-mono text-xs text-kite-muted">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kite-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-kite-success" />
          </span>
          <span>Kite AI Testnet</span>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-kite-border bg-kite-bg px-3 py-2 font-mono text-sm text-foreground">
          <span title={address}>{truncateAddress(address)}</span>
          <button
            type="button"
            onClick={() => void copyAddress()}
            className="text-xs text-kite-accent underline-offset-2 hover:underline"
          >
            {copyDone ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="font-mono text-sm text-kite-usdt">
          {balancePending && usdtBalance === null ? (
            <span className="text-kite-muted">USDT …</span>
          ) : usdtBalance === null ? (
            <span className="text-kite-muted" title="Set KITE_USDT_CONTRACT">
              USDT —
            </span>
          ) : (
            <span>
              USDT{' '}
              {usdtBalance.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={disconnect}
        className="font-mono text-xs text-kite-muted opacity-0 transition-opacity hover:text-[var(--accent-danger)] group-hover:opacity-100"
      >
        Disconnect
      </button>
    </div>
  )
}

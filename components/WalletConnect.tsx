// KiteDesk | MetaMask connect, USDT balance (light theme)
'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ethers } from 'ethers'
import { checkUsdtBalance } from '@/lib/payment'
import { brandEase, brandLinkLight, brandPrimaryButton } from '@/lib/brand'

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
      <div className="flex w-full flex-col items-stretch gap-2 sm:items-end">
        <motion.button
          type="button"
          onClick={() => void connect()}
          disabled={isConnecting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ ease: brandEase }}
          className={`${brandPrimaryButton} w-full sm:w-auto`}
        >
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </motion.button>
        {error ? (
          <p className="max-w-full text-left text-xs text-red-600 sm:max-w-xs sm:text-right">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="group relative flex w-full flex-col items-start gap-3 sm:items-end">
      <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
        <div className="flex items-center gap-2 font-sans text-xs text-slate-600">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          <span>Kite AI Testnet</span>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-sans text-sm text-slate-900 shadow-sm">
          <span title={address}>{truncateAddress(address)}</span>
          <button
            type="button"
            onClick={() => void copyAddress()}
            className={`text-xs underline-offset-2 ${brandLinkLight}`}
          >
            {copyDone ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="font-sans text-sm font-medium text-emerald-800">
          {balancePending && usdtBalance === null ? (
            <span className="text-slate-500">USDT …</span>
          ) : usdtBalance === null ? (
            <span
              className="text-slate-500"
              title="Could not read USDT balance (RPC error). Optional: set NEXT_PUBLIC_KITE_USDT_CONTRACT to override the default Kite testnet USDT."
            >
              USDT unavailable
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
        className="min-h-[44px] px-1 font-sans text-xs text-slate-500 opacity-100 transition-opacity hover:text-red-600 sm:min-h-0 sm:opacity-0 sm:group-hover:opacity-100"
      >
        Disconnect
      </button>
    </div>
  )
}

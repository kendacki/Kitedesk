// KiteDesk | MetaMask connect, USDT balance (light theme)
'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ethers } from 'ethers'
import { checkUsdtBalance } from '@/lib/payment'
import { brandEase, brandLinkLight, brandPrimaryButton } from '@/lib/brand'
import { formatWalletUsdtForDisplay } from '@/lib/formatWalletUsdt'
import { SessionKeyFundingStatus } from '@/components/SessionKeyFundingStatus'
import { SessionKeyDebugStatus } from '@/components/SessionKeyDebugStatus'

function truncateAddress(address: string): string {
  if (address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export type WalletConnectProps = {
  address: string | null
  provider: ethers.BrowserProvider | null
  connect: () => Promise<void>
  disconnect: () => void
  switchToKite?: () => Promise<void>
  wrongNetwork?: boolean
  isConnecting: boolean
  error: string | null
}

export function WalletConnect({
  address,
  provider,
  connect,
  disconnect,
  switchToKite,
  wrongNetwork = false,
  isConnecting,
  error,
}: WalletConnectProps) {
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null)
  const [balancePending, setBalancePending] = useState(false)
  const [copyDone, setCopyDone] = useState(false)

  const refreshBalance = useCallback(async () => {
    if (!provider || !address) {
      console.debug(
        '[WalletConnect] refreshBalance skipped: missing provider or address',
        {
          hasProvider: Boolean(provider),
          address,
        }
      )
      setUsdtBalance(null)
      return
    }
    setBalancePending(true)
    console.debug('[WalletConnect] refreshBalance start', { address })
    try {
      // Try to read the network, but attempt token balance read regardless of reported network.
      // Some providers may report transient chain states; prefer showing a best-effort USDT balance.
      try {
        const net = await provider.getNetwork()
        console.debug('[WalletConnect] provider.getNetwork success', {
          chainId: Number(net.chainId),
          name: net.name,
        })
      } catch (networkErr) {
        const message =
          networkErr instanceof Error ? networkErr.message : String(networkErr)
        console.error('[WalletConnect] provider.getNetwork error', {
          address,
          error: message,
        })
        // ignore network read error and proceed to balance check
      }
      const bal = await checkUsdtBalance(provider, address)
      console.debug('[WalletConnect] checkUsdtBalance result', {
        address,
        balance: bal,
      })
      setUsdtBalance(bal)
    } catch (balanceErr) {
      const message =
        balanceErr instanceof Error ? balanceErr.message : String(balanceErr)
      console.error('[WalletConnect] refreshBalance failed', {
        address,
        error: message,
      })
      setUsdtBalance(null)
    } finally {
      setBalancePending(false)
      console.debug('[WalletConnect] refreshBalance done', { address })
    }
  }, [provider, address])

  useEffect(() => {
    void refreshBalance()
  }, [refreshBalance, wrongNetwork])

  // note: session-key id handled elsewhere; no manual top-up UI here

  useEffect(() => {
    if (!provider || !address) return
    const t = setInterval(() => {
      void refreshBalance()
    }, 45000)
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
    <div className="flex w-full flex-col items-stretch gap-3 sm:items-end">
      {wrongNetwork && switchToKite ? (
        <div className="flex w-full flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 sm:items-end">
          <p className="text-left font-sans text-xs text-amber-900 sm:text-right">
            Wrong network — switch to Kite. You must use chain ID 2368 to see USDT and
            pay.
          </p>
          <button
            type="button"
            onClick={() => void switchToKite()}
            disabled={isConnecting}
            className="min-h-[40px] w-full rounded-lg border border-amber-300 bg-white px-3 font-sans text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 disabled:opacity-60 sm:w-auto"
          >
            {isConnecting ? 'Switching…' : 'Switch to Kite testnet'}
          </button>
        </div>
      ) : null}
      {error && address ? (
        <p className="max-w-full text-left text-xs text-red-600 sm:max-w-sm sm:text-right">
          {error}
        </p>
      ) : null}
      <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
        <div className="flex items-center gap-2 font-sans text-xs text-slate-600">
          <span className="relative flex h-2 w-2 shrink-0">
            {wrongNetwork ? (
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            ) : (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </>
            )}
          </span>
          <span>
            {wrongNetwork
              ? 'Wrong network — switch to Kite'
              : 'Kite AI Testnet (Connected)'}
          </span>
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
            <span className="text-slate-500">…</span>
          ) : usdtBalance === null ? (
            <span
              className="text-slate-500"
              title="Could not read USDT balance (RPC error). Optional: set NEXT_PUBLIC_KITE_USDT_CONTRACT to override the default Kite testnet USDT."
            >
              USDT unavailable
            </span>
          ) : (
            (() => {
              const { line, title } = formatWalletUsdtForDisplay(usdtBalance)
              return (
                <span className="text-emerald-900" title={title}>
                  {line}
                </span>
              )
            })()
          )}
        </div>
      </div>

      <div className="w-full sm:w-auto sm:self-end">
        <button
          type="button"
          onClick={disconnect}
          className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-gradient-to-br from-emerald-900 to-emerald-500 px-6 font-sans text-sm font-semibold text-white shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:w-auto"
        >
          Disconnect
        </button>
      </div>
      <SessionKeyFundingStatus address={address} />
      <SessionKeyDebugStatus address={address} />
    </div>
  )
}

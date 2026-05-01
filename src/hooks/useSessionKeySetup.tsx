'use client'

import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '@/hooks/useWallet'
import { CONTRACTS, KITE_X402, KITE_CHAIN } from '@/lib/constants'

interface UseSessionKeySetupReturn {
  isInitializing: boolean
  error: string | null
  initializeSessionKey: (
    budgetUsdt: number,
    recipients: string[]
  ) => Promise<{
    keyId: string
    sessionKeyAddress: string
    expiresAt: string
  } | null>
}

export function useSessionKeySetup(): UseSessionKeySetupReturn {
  const { address, signer } = useWallet()
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initializeSessionKey = useCallback(
    async (budgetUsdt: number, recipients: string[]) => {
      if (!signer || !address) {
        setError('Wallet not connected')
        return null
      }

      setIsInitializing(true)
      setError(null)

      try {
        const authorizationMessage = `Authorize session key for ${budgetUsdt} USDT, max $50 per transaction, 24-hour expiration. ${new Date(
          Date.now() + 24 * 3600 * 1000
        ).toISOString()}`

        const signature = await signer.signMessage(authorizationMessage)

        const response = await fetch('/api/session-keys/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userSmartWallet: address,
            signature,
            authorizationMessage,
            budgetUsdt,
            maxPerTxUsdt: Math.min(50, budgetUsdt),
            expiresInHours: 24,
            whitelistedRecipients: recipients,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create session key')
        }

        const data = await response.json()

        localStorage.setItem(`session-key-${address}`, data.keyId)

        // Attempt to seed-fund the session key from the connected wallet so
        // subsequent Goal prepay can use the session key without additional
        // MetaMask popups. This will prompt one transfer confirmation now.
        try {
          if (signer && data.sessionKeyAddress && CONTRACTS.usdt) {
            const provider = signer.provider
            if (provider) {
              const net = await provider.getNetwork()
              if (Number(net.chainId) === KITE_CHAIN.id) {
                const token = new ethers.Contract(
                  CONTRACTS.usdt,
                  [
                    'function transfer(address to, uint256 amount) returns (bool)',
                    'function decimals() view returns (uint8)',
                  ],
                  signer
                )
                let unitDecimals: number = KITE_X402.stablecoinDecimals
                try {
                  unitDecimals = Number(await token.decimals())
                } catch {
                  /* keep fallback decimals */
                }

                const amount = ethers.parseUnits(String(budgetUsdt), unitDecimals)
                const tx = await token.transfer(data.sessionKeyAddress, amount)
                await tx.wait()
                console.debug(
                  '[useSessionKeySetup] Funded session key',
                  data.sessionKeyAddress
                )
              } else {
                console.debug('[useSessionKeySetup] Skipping funding: wrong network')
              }
            }
          }
        } catch (fundErr) {
          console.warn('[useSessionKeySetup] Session key funding failed:', fundErr)
        }

        setIsInitializing(false)
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        setIsInitializing(false)
        return null
      }
    },
    [signer, address]
  )

  return {
    isInitializing,
    error,
    initializeSessionKey,
  }
}

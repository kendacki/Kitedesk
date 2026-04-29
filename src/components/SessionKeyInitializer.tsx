'use client'

import { useEffect, useRef } from 'react'
import { useWallet } from '@/components/WalletProvider'

/**
 * SessionKeyInitializer: Automatically initializes and manages session keys
 * for the user's wallet. Session keys enable transaction signing without
 * requiring manual MetaMask approvals for each x402 payment.
 */
export function SessionKeyInitializer() {
  const { address } = useWallet()
  const initializationAttempted = useRef<Set<string>>(new Set())
  const isInitializing = useRef(false)

  useEffect(() => {
    if (!address || isInitializing.current) {
      return
    }

    // Prevent duplicate initialization attempts for the same address
    if (initializationAttempted.current.has(address)) {
      return
    }

    isInitializing.current = true

    const checkAndInitializeSessionKey = async () => {
      try {
        // Check if session key already exists in localStorage
        const storedKeyId = localStorage.getItem(`session-key-${address}`)
        if (storedKeyId) {
          initializationAttempted.current.add(address)
          return
        }

        // Fetch session keys from backend to see if any exist
        try {
          const listRes = await fetch('/api/session-keys/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userSmartWallet: address }),
          })

          if (listRes.ok) {
            const listData = await listRes.json()
            if (listData.sessionKeys && listData.sessionKeys.length > 0) {
              // Use the first active session key
              const firstKey = listData.sessionKeys[0]
              if (typeof firstKey.keyId === 'string') {
                localStorage.setItem(`session-key-${address}`, firstKey.keyId)
                initializationAttempted.current.add(address)
                return
              }
            }
          }
        } catch (error) {
          // Log but continue - session key creation can happen on-demand
          console.debug('[SessionKeyInitializer] Failed to fetch existing keys:', error)
        }

        // No session key found - that's okay, it will be created on first use or manually
        initializationAttempted.current.add(address)
      } catch (error) {
        console.error('[SessionKeyInitializer] Error during initialization:', error)
        initializationAttempted.current.add(address)
      } finally {
        isInitializing.current = false
      }
    }

    checkAndInitializeSessionKey()
  }, [address])

  // This component doesn't render anything visible - it just manages initialization side effects
  return null
}

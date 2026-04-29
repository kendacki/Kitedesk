'use client'

import { useEffect, useRef } from 'react'
import { useWallet } from '@/components/WalletProvider'

/**
 * SessionKeyInitializer: Automatically initializes and manages session keys
 * for the user's wallet. Session keys enable transaction signing without
 * requiring manual MetaMask approvals for each x402 payment.
 *
 * On wallet connect:
 * 1. Check localStorage for existing key
 * 2. Fetch from backend if not in localStorage
 * 3. Store keyId in localStorage for seamless x402 payment signing
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
          console.debug('[SessionKeyInitializer] Using existing session key from localStorage')
          initializationAttempted.current.add(address)
          return
        }

        // Fetch session keys from backend to see if any exist for this wallet
        try {
          const listRes = await fetch('/api/session-keys/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userSmartWallet: address }),
          })

          if (listRes.ok) {
            const listData = await listRes.json()
            if (listData.sessionKeys && listData.sessionKeys.length > 0) {
              // Use the first active session key found on backend
              const firstKey = listData.sessionKeys[0]
              if (typeof firstKey.keyId === 'string') {
                localStorage.setItem(`session-key-${address}`, firstKey.keyId)
                console.debug('[SessionKeyInitializer] Loaded session key from backend:', firstKey.keyId)
                initializationAttempted.current.add(address)
                return
              }
            }
          }
        } catch (error) {
          // Log but continue - if backend fetch fails, session key can still be created on first transaction
          console.debug('[SessionKeyInitializer] Failed to fetch existing keys from backend:', error)
        }

        // No existing session key found locally or on backend
        // This is normal - session keys are created on first transaction when needed
        console.debug('[SessionKeyInitializer] No existing session key found. Will be created on first transaction.')
        initializationAttempted.current.add(address)
      } catch (error) {
        console.error('[SessionKeyInitializer] Unexpected error during initialization:', error)
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

'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@/components/WalletProvider'

/**
 * SessionKeyInitializer: Automatically initializes and manages session keys
 * for the user's wallet. Session keys enable transaction signing without
 * requiring manual MetaMask approvals for each x402 payment.
 */
export function SessionKeyInitializer() {
  const { address } = useWallet()
  const [isChecking, setIsChecking] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!address) {
      setInitialized(false)
      return
    }

    const checkAndInitializeSessionKey = async () => {
      setIsChecking(true)
      try {
        // Check if session key already exists in localStorage
        const storedKeyId = localStorage.getItem(`session-key-${address}`)
        if (storedKeyId) {
          setInitialized(true)
          setIsChecking(false)
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
                setInitialized(true)
                setIsChecking(false)
                return
              }
            }
          }
        } catch {
          // Continue to initialization if list fails
        }

        // No session key found, that's okay - it will be created on first use if needed
        // Or the user can manually initialize one via the wallet interface
        setInitialized(true)
        setIsChecking(false)
      } catch (error) {
        console.error('[SessionKeyInitializer] Error checking session keys:', error)
        setInitialized(true)
        setIsChecking(false)
      }
    }

    checkAndInitializeSessionKey()
  }, [address])

  // This component doesn't render anything visible - it just manages state
  return null
}

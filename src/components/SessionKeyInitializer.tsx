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
 * 3. Create new session key if none exist (requires MetaMask signature)
 * 4. Store keyId in localStorage for seamless x402 payment signing
 */
export function SessionKeyInitializer() {
  const { address, provider } = useWallet()
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
          // Log but continue - attempt to create new session key
          console.debug('[SessionKeyInitializer] Failed to fetch existing keys from backend:', error)
        }

        // No existing session key found - attempt to create a new one
        if (provider) {
          try {
            console.debug('[SessionKeyInitializer] Creating new session key...')
            const signer = await provider.getSigner()
            const signerAddress = await signer.getAddress()

            // Create authorization message for session key creation
            const authMessage = `Create session key for ${signerAddress}`
            const signature = await signer.signMessage(authMessage)

            // Call backend to create the session key
            const createRes = await fetch('/api/session-keys/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userSmartWallet: address,
                signature,
                authorizationMessage: authMessage,
                budgetUsdt: 1.0, // Default budget: $1.00 per day
                maxPerTxUsdt: 0.5, // Max $0.50 per transaction
                expiresInHours: 24, // Expires in 24 hours
                whitelistedRecipients: [
                  '0x1234567890123456789012345678901234567890', // Placeholder - can be configured
                ],
              }),
            })

            if (createRes.ok) {
              const createData = await createRes.json()
              if (createData.keyId) {
                localStorage.setItem(`session-key-${address}`, createData.keyId)
                console.debug('[SessionKeyInitializer] Successfully created and stored session key:', createData.keyId)
                initializationAttempted.current.add(address)
                return
              }
            } else {
              const errorData = await createRes.json()
              console.warn('[SessionKeyInitializer] Failed to create session key:', errorData.error)
            }
          } catch (createError) {
            // If user rejects signature or other error occurs, that's okay
            // Session keys can be created on first transaction
            console.debug('[SessionKeyInitializer] Could not auto-create session key:', createError)
          }
        }

        // Fallback: No existing session key and auto-creation failed
        // Session keys will be created on-demand on first x402 transaction
        console.debug('[SessionKeyInitializer] Session key initialization deferred to first transaction.')
        initializationAttempted.current.add(address)
      } catch (error) {
        console.error('[SessionKeyInitializer] Unexpected error during initialization:', error)
        initializationAttempted.current.add(address)
      } finally {
        isInitializing.current = false
      }
    }

    checkAndInitializeSessionKey()
  }, [address, provider])

  // This component doesn't render anything visible - it just manages initialization side effects
  return null
}

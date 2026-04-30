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
 * 3. Attempt to auto-create new session key if none found
 * 4. Store keyId in localStorage for seamless x402 payment signing
 *
 * Auto-creation requires one MetaMask signature but eliminates prompts for subsequent transactions.
 */
export function SessionKeyInitializer() {
  const { address, signer } = useWallet()
  const initializationAttempted = useRef<Set<string>>(new Set())
  const isInitializing = useRef(false)

  useEffect(() => {
    // Reset initialization tracking when user disconnects so it will re-initialize on reconnect
    if (!address) {
      initializationAttempted.current.clear()
      isInitializing.current = false
    }
  }, [address])

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
          console.debug(
            '[SessionKeyInitializer] Using existing session key from localStorage'
          )
          initializationAttempted.current.add(address)
          return
        }

        // Fetch session keys from backend to see if any exist for this wallet
        try {
          const listRes = await fetch(
            `/api/session-keys/list?wallet=${encodeURIComponent(address)}`
          )

          if (listRes.ok) {
            const listData = await listRes.json()
            if (listData.keys && listData.keys.length > 0) {
              // Use the first active session key found on backend
              const firstKey = listData.keys[0]
              if (typeof firstKey.key_id === 'string') {
                localStorage.setItem(`session-key-${address}`, firstKey.key_id)
                console.debug(
                  '[SessionKeyInitializer] Loaded session key from backend:',
                  firstKey.key_id
                )
                initializationAttempted.current.add(address)
                return
              }
            }
          }
        } catch (error) {
          // Log but continue - attempt to create new key if signer available
          console.debug(
            '[SessionKeyInitializer] Failed to fetch existing keys from backend:',
            error
          )
        }

        // No existing session key found - attempt to auto-create one
        if (signer) {
          try {
            const authMsg = `Authorize session key creation for ${address}`
            const signature = await signer.signMessage(authMsg)

            const createRes = await fetch('/api/session-keys/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userSmartWallet: address,
                signature,
                authorizationMessage: authMsg,
                budgetUsdt: 10, // Default budget for auto-created keys
                maxPerTxUsdt: 5,
                expiresInHours: 24,
                // whitelistedRecipients will be auto-populated by the API
              }),
            })

            if (createRes.ok) {
              const createData = await createRes.json()
              if (createData.keyId) {
                localStorage.setItem(`session-key-${address}`, createData.keyId)
                console.debug(
                  '[SessionKeyInitializer] Auto-created new session key:',
                  createData.keyId
                )
                initializationAttempted.current.add(address)
                return
              }
            } else {
              console.debug(
                '[SessionKeyInitializer] Auto-creation failed:',
                await createRes.text()
              )
            }
          } catch (error) {
            console.debug(
              '[SessionKeyInitializer] Auto-creation error (will retry on first transaction):',
              error
            )
          }
        }

        // Fallback: No session key found and couldn't create one yet
        // Session key will be created on first x402 transaction when needed
        console.debug(
          '[SessionKeyInitializer] Will create session key on first x402 transaction'
        )
        initializationAttempted.current.add(address)
      } catch (error) {
        console.error(
          '[SessionKeyInitializer] Unexpected error during initialization:',
          error
        )
        initializationAttempted.current.add(address)
      } finally {
        isInitializing.current = false
      }
    }

    checkAndInitializeSessionKey()
  }, [address, signer])

  // This component doesn't render anything visible - it just manages initialization side effects
  return null
}

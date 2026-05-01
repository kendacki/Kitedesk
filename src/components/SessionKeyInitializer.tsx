'use client'

import { useEffect, useRef } from 'react'
import { type JsonRpcSigner, ethers } from 'ethers'
import { useWallet } from '@/components/WalletProvider'
import { CONTRACTS, KITE_X402, KITE_CHAIN } from '@/lib/constants'

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

  // Named initializer so we can call it from both the effect and an explicit connect event
  const runInitialization = async (
    addr: string | null,
    signerObj: JsonRpcSigner | null
  ) => {
    if (!addr || isInitializing.current) return
    if (initializationAttempted.current.has(addr)) return

    isInitializing.current = true
    try {
      // Check localStorage first
      const storedKeyId = localStorage.getItem(`session-key-${addr}`)
      if (storedKeyId) {
        console.debug(
          '[SessionKeyInitializer] Using existing session key from localStorage'
        )
        initializationAttempted.current.add(addr)
        return
      }

      // Try backend list
      try {
        const listRes = await fetch(
          `/api/session-keys/list?wallet=${encodeURIComponent(addr)}`
        )
        if (listRes.ok) {
          const listData = await listRes.json()
          if (listData.keys && listData.keys.length > 0) {
            const firstKey = listData.keys[0]
            if (typeof firstKey.key_id === 'string') {
              localStorage.setItem(`session-key-${addr}`, firstKey.key_id)
              console.debug(
                '[SessionKeyInitializer] Loaded session key from backend:',
                firstKey.key_id
              )
              initializationAttempted.current.add(addr)
              return
            }
          }
        }
      } catch (error) {
        console.debug(
          '[SessionKeyInitializer] Failed to fetch existing keys from backend:',
          error
        )
      }

      // Attempt create if signer present
      if (signerObj) {
        try {
          const authMsg = `Authorize session key creation for ${addr}`
          const signature = await signerObj.signMessage(authMsg)

          const createRes = await fetch('/api/session-keys/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userSmartWallet: addr,
              signature,
              authorizationMessage: authMsg,
              budgetUsdt: 10,
              maxPerTxUsdt: 5,
              expiresInHours: 24,
            }),
          })

          if (createRes.ok) {
            const createData = await createRes.json()
            if (createData.keyId) {
              localStorage.setItem(`session-key-${addr}`, createData.keyId)
              console.debug('[SessionKeyInitializer] Auto-created new session key:', createData.keyId)

              // Auto-fund newly created session-key subwallet with 1 USDT from the connected wallet
              // so server-side session-key prepay attempts can succeed without additional popups.
              try {
                try {
                  localStorage.setItem(
                    `session-key-funding-${addr}`,
                    JSON.stringify({ status: 'pending', txHash: null, error: null })
                  )
                } catch {
                  /* ignore storage failures */
                }

                if (signer && createData.sessionKeyAddress && CONTRACTS.usdt) {
                  const provider = signer.provider
                  if (provider) {
                    const net = await provider.getNetwork()
                    if (Number(net.chainId) === KITE_CHAIN.id) {
                      const token = new ethers.Contract(
                        CONTRACTS.usdt,
                        ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'],
                        signer
                      )
                      let unitDecimals: number = KITE_X402.stablecoinDecimals
                      try {
                        unitDecimals = Number(await token.decimals())
                      } catch {
                        /* keep fallback decimals */
                      }

                      const amountUnits = ethers.parseUnits('1', unitDecimals)
                      const tx = await token.transfer(createData.sessionKeyAddress, amountUnits)
                      const receipt = await tx.wait()
                      try {
                        localStorage.setItem(
                          `session-key-funding-${addr}`,
                          JSON.stringify({ status: 'success', txHash: receipt.transactionHash, error: null })
                        )
                      } catch {
                        /* ignore */
                      }
                      console.debug('[SessionKeyInitializer] Funded session key', createData.sessionKeyAddress)
                    } else {
                      console.debug('[SessionKeyInitializer] Skipping funding: wrong network')
                      try {
                        localStorage.setItem(
                          `session-key-funding-${addr}`,
                          JSON.stringify({ status: 'skipped', txHash: null, error: 'wrong network' })
                        )
                      } catch {
                        /* ignore */
                      }
                    }
                  }
                }
              } catch (fundErr) {
                console.warn('[SessionKeyInitializer] Session key funding failed:', fundErr)
                try {
                  localStorage.setItem(
                    `session-key-funding-${addr}`,
                    JSON.stringify({ status: 'failed', txHash: null, error: String(fundErr) })
                  )
                } catch {
                  /* ignore */
                }
              }
              initializationAttempted.current.add(addr)
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
            '[SessionKeyInitializer] Auto-creation error (will retry later):',
            error
          )
        }
      }

      console.debug(
        '[SessionKeyInitializer] Will create session key on first x402 transaction'
      )
    } finally {
      isInitializing.current = false
    }
  }

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
    void runInitialization(address, signer)
  }, [address, signer])

  useEffect(() => {
    const onConnect = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as { address?: string }
        const addr = detail?.address ?? address
        void runInitialization(addr ?? null, signer)
      } catch (err) {
        console.debug('[SessionKeyInitializer] connect event handler error', err)
      }
    }

    window.addEventListener('kitedesk:connect', onConnect)
    return () => window.removeEventListener('kitedesk:connect', onConnect)
  }, [address, signer])

  // This component doesn't render anything visible - it just manages initialization side effects
  return null
}

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { type JsonRpcSigner, ethers } from 'ethers'
import { useWallet } from '@/components/WalletProvider'
import { CONTRACTS, KITE_X402, KITE_CHAIN } from '@/lib/constants'
import { checkUsdtBalance } from '@/lib/payment'

const sessionKeyInitializationInFlight = new Set<string>()
const SESSION_KEY_GAS_TOP_UP = ethers.parseEther('0.05')
const SESSION_KEY_REFUEL_THRESHOLD_USDT = 0.25

// Track which session-key addresses we've already topped up in-memory
const sessionKeyGasTopUpDone = new Set<string>()

async function fundSessionKeyGas(
  signer: JsonRpcSigner,
  sessionKeyAddress: string
): Promise<string | null> {
  try {
    const addr = ethers.getAddress(sessionKeyAddress)
    if (sessionKeyGasTopUpDone.has(addr)) return null

    const provider = signer.provider
    if (!provider) return null

    const currentBalance = await provider.getBalance(addr)
    if (currentBalance >= SESSION_KEY_GAS_TOP_UP) {
      sessionKeyGasTopUpDone.add(addr)
      return null
    }

    const tx = await signer.sendTransaction({ to: addr, value: SESSION_KEY_GAS_TOP_UP })
    const receipt = await tx.wait()
    if (receipt && receipt.status === 1) {
      sessionKeyGasTopUpDone.add(addr)
      return receipt.hash
    }
    return receipt?.hash ?? null
  } catch {
    // don't propagate gas top-up errors; caller will log
    return null
  }
}

function storeSessionKeyMeta(userAddress: string, keyId: string, sessionKeyAddress?: string | null) {
  localStorage.setItem(`session-key-${userAddress}`, keyId)
  if (sessionKeyAddress && ethers.isAddress(sessionKeyAddress)) {
    localStorage.setItem(
      `session-key-address-${userAddress}`,
      ethers.getAddress(sessionKeyAddress)
    )
  }
}

function setFundingStatus(
  userAddress: string,
  payload: {
    status: 'pending' | 'success' | 'failed' | 'skipped'
    txHash: string | null
    error: string | null
    note?: string | null
  }
) {
  try {
    localStorage.setItem(`session-key-funding-${userAddress}`, JSON.stringify(payload))
  } catch {
    /* ignore storage failures */
  }
}

function setRefuelCooldown(userAddress: string, cooldownMs: number) {
  try {
    localStorage.setItem(
      `session-key-refuel-until-${userAddress}`,
      String(Date.now() + cooldownMs)
    )
  } catch {
    /* ignore storage failures */
  }
}

async function resolveSessionKeyAddress(userAddress: string) {
  const storedAddress = localStorage.getItem(`session-key-address-${userAddress}`)
  if (storedAddress && ethers.isAddress(storedAddress)) {
    return ethers.getAddress(storedAddress)
  }

  try {
    const listRes = await fetch(`/api/session-keys/list?wallet=${encodeURIComponent(userAddress)}`)
    if (listRes.ok) {
      const listData = await listRes.json()
      const firstKey = Array.isArray(listData.keys) ? listData.keys[0] : null
      const sessionKeyAddress =
        typeof firstKey?.sessionKeyAddress === 'string'
          ? firstKey.sessionKeyAddress
          : typeof firstKey?.session_key_address === 'string'
            ? firstKey.session_key_address
            : ''
      const keyId =
        typeof firstKey?.keyId === 'string'
          ? firstKey.keyId
          : typeof firstKey?.key_id === 'string'
            ? firstKey.key_id
            : ''

      if (keyId) {
        localStorage.setItem(`session-key-${userAddress}`, keyId)
      }
      if (sessionKeyAddress && ethers.isAddress(sessionKeyAddress)) {
        const checksum = ethers.getAddress(sessionKeyAddress)
        localStorage.setItem(`session-key-address-${userAddress}`, checksum)
        return checksum
      }
    }
  } catch (error) {
    console.debug('[SessionKeyInitializer] Failed to resolve session key address:', error)
  }

  return null
}

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
  const refuelInFlight = useRef(false)
  const refuelCooldownBySession = useRef<Map<string, number>>(new Map())

  const maybeRefuelSessionKey = useCallback(async (
    userAddress: string,
    signerObj: JsonRpcSigner | null
  ) => {
    if (!userAddress || !signerObj || refuelInFlight.current) return

    const sessionKeyAddress = await resolveSessionKeyAddress(userAddress)
    if (!sessionKeyAddress) return

    const now = Date.now()
    const lastAttempt = refuelCooldownBySession.current.get(sessionKeyAddress) || 0
    if (now - lastAttempt < 90_000) return

    const provider = signerObj.provider
    if (!provider) return

    const refuelUntilRaw = localStorage.getItem(
      `session-key-refuel-until-${userAddress}`
    )
    const refuelUntil = refuelUntilRaw ? Number(refuelUntilRaw) : 0
    if (Number.isFinite(refuelUntil) && refuelUntil > Date.now()) {
      return
    }

    const balance = await checkUsdtBalance(
      provider as unknown as ethers.BrowserProvider,
      sessionKeyAddress
    )
    if (balance === null || balance >= SESSION_KEY_REFUEL_THRESHOLD_USDT) return

    refuelInFlight.current = true
    refuelCooldownBySession.current.set(sessionKeyAddress, now)
    setFundingStatus(userAddress, {
      status: 'pending',
      txHash: null,
      error: null,
      note: 'Agent wallet balance is low. Refilling 1 USDT from the connected wallet...',
    })

    try {
      try {
        const gasTxHash = await fundSessionKeyGas(signerObj, sessionKeyAddress)
        if (gasTxHash) {
          console.debug('[SessionKeyInitializer] Topped up session key gas', {
            sessionKeyAddress,
            gasTxHash,
          })
        }
      } catch (gasErr) {
        console.warn('[SessionKeyInitializer] Session key gas top-up failed:', gasErr)
      }

      const net = await provider.getNetwork()
      if (Number(net.chainId) !== KITE_CHAIN.id) {
        setFundingStatus(userAddress, {
          status: 'skipped',
          txHash: null,
          error: 'wrong network',
          note: 'Session key refill skipped because the wallet is not on Kite testnet.',
        })
        return
      }

      if (!CONTRACTS.usdt) {
        throw new Error('USDT contract is not configured')
      }

      const token = new ethers.Contract(
        CONTRACTS.usdt,
        [
          'function transfer(address to, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)',
        ],
        signerObj
      )

      let unitDecimals: number = KITE_X402.stablecoinDecimals
      try {
        unitDecimals = Number(await token.decimals())
      } catch {
        /* keep fallback decimals */
      }

      const amountUnits = ethers.parseUnits('1', unitDecimals)
      const tx = await token.transfer(sessionKeyAddress, amountUnits)
      const receipt = await tx.wait()

      setFundingStatus(userAddress, {
        status: 'success',
        txHash: receipt?.transactionHash ?? tx.hash,
        error: null,
        note: 'Agent wallet refilled with 1 USDT.',
      })
      setRefuelCooldown(userAddress, 10 * 60 * 1000)
      console.debug('[SessionKeyInitializer] Refueled session key', sessionKeyAddress)
    } catch (fundErr) {
      console.warn('[SessionKeyInitializer] Session key refuel failed:', fundErr)
      setFundingStatus(userAddress, {
        status: 'failed',
        txHash: null,
        error: String(fundErr),
        note: 'Agent wallet balance is low, but the refill transaction failed.',
      })
    } finally {
      refuelInFlight.current = false
    }
  }, [])

  // Named initializer so we can call it from both the effect and an explicit connect event
  const runInitialization = useCallback(async (
    addr: string | null,
    signerObj: JsonRpcSigner | null
  ) => {
    if (!addr || isInitializing.current) return

    // Normalize to checksummed address to avoid case/format duplication
    let userAddr = addr
    try {
      userAddr = ethers.getAddress(addr)
    } catch {
      userAddr = addr
    }

    if (initializationAttempted.current.has(userAddr)) return
    if (sessionKeyInitializationInFlight.has(userAddr)) return

    sessionKeyInitializationInFlight.add(userAddr)
    isInitializing.current = true
    try {
      // Check localStorage first
      const storedKeyId = localStorage.getItem(`session-key-${userAddr}`)
      if (storedKeyId) {
        console.debug(
          '[SessionKeyInitializer] Using existing session key from localStorage'
        )
        initializationAttempted.current.add(userAddr)
        return
      }

      // Try backend list
      try {
        const listRes = await fetch(
          `/api/session-keys/list?wallet=${encodeURIComponent(userAddr)}`
        )
        if (listRes.ok) {
          const listData = await listRes.json()
          if (listData.keys && listData.keys.length > 0) {
            const firstKey = listData.keys[0]
            const keyId =
              typeof firstKey.keyId === 'string'
                ? firstKey.keyId
                : typeof firstKey.key_id === 'string'
                  ? firstKey.key_id
                  : ''
            if (keyId) {
              storeSessionKeyMeta(
                userAddr,
                keyId,
                typeof firstKey.sessionKeyAddress === 'string'
                  ? firstKey.sessionKeyAddress
                  : typeof firstKey.session_key_address === 'string'
                    ? firstKey.session_key_address
                    : null
              )
              console.debug(
                '[SessionKeyInitializer] Loaded session key from backend:',
                keyId
              )
              initializationAttempted.current.add(userAddr)
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
          const authMsg = `Authorize session key creation for ${userAddr}`
          const signature = await signerObj.signMessage(authMsg)

          const createRes = await fetch('/api/session-keys/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userSmartWallet: userAddr,
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
              storeSessionKeyMeta(userAddr, createData.keyId, createData.sessionKeyAddress)
              console.debug(
                '[SessionKeyInitializer] Auto-created new session key:',
                createData.keyId
              )

              // Auto-fund newly created session-key subwallet with 1 USDT from the connected wallet
              // so server-side session-key prepay attempts can succeed without additional popups.
              try {
                try {
                        setFundingStatus(userAddr, {
                    status: 'pending',
                    txHash: null,
                    error: null,
                    note: 'Funding newly created agent wallet with 1 USDT...',
                  })
                } catch {
                  /* ignore storage failures */
                }

                if (signerObj && createData.sessionKeyAddress && CONTRACTS.usdt) {
                  const provider = signerObj.provider
                  if (provider) {
                    const net = await provider.getNetwork()
                    if (Number(net.chainId) === KITE_CHAIN.id) {
                      const token = new ethers.Contract(
                        CONTRACTS.usdt,
                        [
                          'function transfer(address to, uint256 amount) returns (bool)',
                          'function decimals() view returns (uint8)',
                        ],
                        signerObj
                      )
                      let unitDecimals: number = KITE_X402.stablecoinDecimals
                      try {
                        unitDecimals = Number(await token.decimals())
                      } catch {
                        /* keep fallback decimals */
                      }

                      const amountUnits = ethers.parseUnits('1', unitDecimals)
                      const tx = await token.transfer(
                        createData.sessionKeyAddress,
                        amountUnits
                      )
                      const receipt = await tx.wait()
                      try {
                        const gasTxHash = await fundSessionKeyGas(
                          signerObj,
                          createData.sessionKeyAddress
                        )
                        if (gasTxHash) {
                          console.debug('[SessionKeyInitializer] Funded session key gas', {
                            sessionKeyAddress: createData.sessionKeyAddress,
                            gasTxHash,
                          })
                        }
                      } catch (gasErr) {
                        console.warn(
                          '[SessionKeyInitializer] Initial session key gas top-up failed:',
                          gasErr
                        )
                      }
                      // Immediately set cooldown to prevent refuel from triggering right after initial funding
                      refuelCooldownBySession.current.set(
                        ethers.getAddress(createData.sessionKeyAddress),
                        Date.now()
                      )
                      try {
                        setFundingStatus(userAddr, {
                          status: 'success',
                          txHash: receipt.transactionHash,
                          error: null,
                          note: 'Agent wallet funded with 1 USDT.',
                        })
                        setRefuelCooldown(userAddr, 10 * 60 * 1000)
                      } catch {
                        /* ignore */
                      }
                      console.debug(
                        '[SessionKeyInitializer] Funded session key',
                        createData.sessionKeyAddress
                      )
                    } else {
                      console.debug(
                        '[SessionKeyInitializer] Skipping funding: wrong network'
                      )
                      try {
                        setFundingStatus(userAddr, {
                          status: 'skipped',
                          txHash: null,
                          error: 'wrong network',
                          note: 'Agent wallet funding skipped because the wallet is not on Kite testnet.',
                        })
                      } catch {
                        /* ignore */
                      }
                    }
                  }
                }
              } catch (fundErr) {
                console.warn(
                  '[SessionKeyInitializer] Session key funding failed:',
                  fundErr
                )
                try {
                  setFundingStatus(userAddr, {
                    status: 'failed',
                    txHash: null,
                    error: String(fundErr),
                    note: 'Initial agent wallet funding failed.',
                  })
                } catch {
                  /* ignore */
                }
              }
              initializationAttempted.current.add(userAddr)
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
      sessionKeyInitializationInFlight.delete(userAddr)
    }
  }, [])

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

    const normalizedAddress = (() => {
      try {
        return ethers.getAddress(address)
      } catch {
        return address
      }
    })()

    // Prevent duplicate initialization attempts for the same address
    if (initializationAttempted.current.has(normalizedAddress)) {
      return
    }
    void runInitialization(normalizedAddress, signer)
  }, [address, signer, runInitialization])

  useEffect(() => {
    if (!address || !signer) return

    const normalizedAddress = (() => {
      try {
        return ethers.getAddress(address)
      } catch {
        return address
      }
    })()

    void maybeRefuelSessionKey(normalizedAddress, signer)
    const interval = window.setInterval(() => {
      void maybeRefuelSessionKey(normalizedAddress, signer)
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [address, signer, maybeRefuelSessionKey])

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
  }, [address, signer, runInitialization])

  // This component doesn't render anything visible - it just manages initialization side effects
  return null
}

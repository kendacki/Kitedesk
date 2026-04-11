// KiteDesk | MetaMask connection and Kite testnet chain state
'use client'

import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { KITE_CHAIN } from '@/lib/constants'

interface WalletState {
  address: string | null
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  isConnecting: boolean
  error: string | null
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    provider: null,
    signer: null,
    isConnecting: false,
    error: null,
  })

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState((s) => ({
        ...s,
        error: 'MetaMask not found. Please install it.',
      }))
      return
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }))

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${KITE_CHAIN.id.toString(16)}` }],
        })
      } catch (switchError: unknown) {
        const code =
          switchError && typeof switchError === 'object' && 'code' in switchError
            ? (switchError as { code?: number }).code
            : undefined
        if (code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${KITE_CHAIN.id.toString(16)}`,
                chainName: KITE_CHAIN.name,
                rpcUrls: [KITE_CHAIN.rpcUrl],
                nativeCurrency: {
                  name: KITE_CHAIN.currency,
                  symbol: KITE_CHAIN.currency,
                  decimals: 18,
                },
                blockExplorerUrls: [KITE_CHAIN.explorerUrl],
              },
            ],
          })
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setState({
        address,
        provider,
        signer,
        isConnecting: false,
        error: null,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      setState((s) => ({ ...s, isConnecting: false, error: message }))
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({
      address: null,
      provider: null,
      signer: null,
      isConnecting: false,
      error: null,
    })
  }, [])

  return { ...state, connect, disconnect }
}

// KiteDesk | MetaMask connection and Kite testnet chain state
'use client'

import { useState, useCallback, useEffect } from 'react'
import { ethers, type Eip1193Provider } from 'ethers'
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

  const disconnect = useCallback(() => {
    setState({
      address: null,
      provider: null,
      signer: null,
      isConnecting: false,
      error: null,
    })
  }, [])

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
      let signer: ethers.JsonRpcSigner
      try {
        signer = await provider.getSigner()
      } catch (signerErr: unknown) {
        const message =
          signerErr instanceof Error ? signerErr.message : 'Could not get wallet signer'
        setState((s) => ({
          ...s,
          isConnecting: false,
          error: `${message} Try refreshing the page and connecting again.`,
        }))
        return
      }

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

  useEffect(() => {
    const eth = window.ethereum
    if (!eth?.on || !eth.removeListener) return

    const refreshFromProvider = async () => {
      try {
        const provider = new ethers.BrowserProvider(eth as Eip1193Provider)
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        setState((s) => ({
          ...s,
          address,
          provider,
          signer,
          isConnecting: false,
          error: null,
        }))
      } catch {
        disconnect()
      }
    }

    const onAccountsChanged = (accounts: unknown) => {
      const list = Array.isArray(accounts) ? accounts : []
      if (list.length === 0) {
        disconnect()
        return
      }
      void refreshFromProvider()
    }

    const onChainChanged = () => {
      disconnect()
    }

    const onDisconnect = () => {
      disconnect()
    }

    eth.on('accountsChanged', onAccountsChanged)
    eth.on('chainChanged', onChainChanged)
    eth.on('disconnect', onDisconnect)

    return () => {
      eth.removeListener?.('accountsChanged', onAccountsChanged)
      eth.removeListener?.('chainChanged', onChainChanged)
      eth.removeListener?.('disconnect', onDisconnect)
    }
  }, [disconnect])

  return { ...state, connect, disconnect }
}

// KiteDesk | MetaMask connection and Kite testnet chain state
'use client'

import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { KITE_CHAIN, KITE_STAY_ON_TESTNET_MESSAGE } from '@/lib/constants'
import {
  getPreferredEip1193Provider,
  type BrowserEip1193Provider,
} from '@/lib/getEip1193Provider'

function formatWalletConnectError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (
    raw.includes('sendMessage') ||
    raw.includes('Extension ID') ||
    raw.includes('chrome-extension://')
  ) {
    return 'A browser extension conflict blocked the wallet (often multiple crypto extensions). Disable other wallet extensions, try an Incognito window with only MetaMask, or another browser profile.'
  }
  if (raw.includes('network changed') || raw.includes('NETWORK_ERROR')) {
    return `${KITE_STAY_ON_TESTNET_MESSAGE}. If the problem persists, reconnect your wallet.`
  }
  return raw
}

function parseChainIdHex(chainIdHex: unknown): number {
  const hex = typeof chainIdHex === 'string' ? chainIdHex : ''
  const n = parseInt(hex.replace(/^0x/i, ''), 16)
  return Number.isFinite(n) ? n : 0
}

async function requestSwitchToKiteChain(eth: BrowserEip1193Provider): Promise<void> {
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${KITE_CHAIN.id.toString(16)}` }],
    })
  } catch (switchError: unknown) {
    const code =
      switchError && typeof switchError === 'object' && 'code' in switchError
        ? (switchError as { code?: number }).code
        : undefined
    if (code === 4902) {
      await eth.request({
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
      return
    }
    throw switchError
  }
}

async function readKiteWalletState(eth: BrowserEip1193Provider): Promise<{
  address: string | null
  provider: ethers.BrowserProvider
  signer: ethers.JsonRpcSigner | null
  wrongNetwork: boolean
}> {
  const provider = new ethers.BrowserProvider(eth)
  const network = await provider.getNetwork()
  const chainOk = Number(network.chainId) === KITE_CHAIN.id

  let address: string | null = null
  try {
    const accounts = (await eth.request({ method: 'eth_accounts' })) as unknown
    if (Array.isArray(accounts) && typeof accounts[0] === 'string') {
      address = accounts[0]
    }
  } catch {
    /* ignore */
  }

  if (!chainOk) {
    return { address, provider, signer: null, wrongNetwork: true }
  }

  if (!address) {
    return { address, provider, signer: null, wrongNetwork: false }
  }

  try {
    const signer = await provider.getSigner()
    return { address, provider, signer, wrongNetwork: false }
  } catch {
    return { address, provider, signer: null, wrongNetwork: false }
  }
}

interface WalletState {
  address: string | null
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  wrongNetwork: boolean
  isConnecting: boolean
  error: string | null
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    provider: null,
    signer: null,
    wrongNetwork: false,
    isConnecting: false,
    error: null,
  })

  const disconnect = useCallback(() => {
    setState({
      address: null,
      provider: null,
      signer: null,
      wrongNetwork: false,
      isConnecting: false,
      error: null,
    })
  }, [])

  const switchToKite = useCallback(async () => {
    const eth = getPreferredEip1193Provider()
    if (!eth) {
      setState((s) => ({
        ...s,
        error: 'No wallet found. Install MetaMask (or disable conflicting wallet extensions).',
      }))
      return
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }))

    try {
      await requestSwitchToKiteChain(eth)

      const next = await readKiteWalletState(eth)
      if (next.wrongNetwork || !next.signer) {
        setState({
          address: next.address,
          provider: next.provider,
          signer: null,
          wrongNetwork: true,
          isConnecting: false,
          error: KITE_STAY_ON_TESTNET_MESSAGE,
        })
        return
      }

      setState({
        address: next.address,
        provider: next.provider,
        signer: next.signer,
        wrongNetwork: false,
        isConnecting: false,
        error: null,
      })
    } catch (err: unknown) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: formatWalletConnectError(err),
      }))
    }
  }, [])

  const connect = useCallback(async () => {
    const eth = getPreferredEip1193Provider()
    if (!eth) {
      setState((s) => ({
        ...s,
        error: 'No wallet found. Install MetaMask (or disable conflicting wallet extensions).',
      }))
      return
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }))

    try {
      await eth.request({ method: 'eth_requestAccounts' })

      try {
        await requestSwitchToKiteChain(eth)
      } catch {
        const early = await readKiteWalletState(eth)
        if (early.wrongNetwork || !early.signer) {
          setState({
            address: early.address,
            provider: early.provider,
            signer: null,
            wrongNetwork: true,
            isConnecting: false,
            error: KITE_STAY_ON_TESTNET_MESSAGE,
          })
          return
        }
      }

      const next = await readKiteWalletState(eth)
      if (!next.address) {
        setState((s) => ({
          ...s,
          isConnecting: false,
          error: 'No account returned from the wallet.',
        }))
        return
      }

      if (next.wrongNetwork || !next.signer) {
        setState({
          address: next.address,
          provider: next.provider,
          signer: null,
          wrongNetwork: true,
          isConnecting: false,
          error: KITE_STAY_ON_TESTNET_MESSAGE,
        })
        return
      }

      setState({
        address: next.address,
        provider: next.provider,
        signer: next.signer,
        wrongNetwork: false,
        isConnecting: false,
        error: null,
      })
    } catch (err: unknown) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: formatWalletConnectError(err),
      }))
    }
  }, [])

  useEffect(() => {
    const eth = getPreferredEip1193Provider()
    if (!eth?.on || !eth.removeListener) return

    const applyKiteState = (next: Awaited<ReturnType<typeof readKiteWalletState>>) => {
      if (!next.address) {
        disconnect()
        return
      }
      if (next.wrongNetwork || !next.signer) {
        setState({
          address: next.address,
          provider: next.provider,
          signer: null,
          wrongNetwork: true,
          isConnecting: false,
          error: KITE_STAY_ON_TESTNET_MESSAGE,
        })
        return
      }
      setState({
        address: next.address,
        provider: next.provider,
        signer: next.signer,
        wrongNetwork: false,
        isConnecting: false,
        error: null,
      })
    }

    const refreshFromProvider = async () => {
      try {
        const next = await readKiteWalletState(eth)
        applyKiteState(next)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('network changed') || msg.includes('NETWORK_ERROR')) {
          try {
            const next = await readKiteWalletState(eth)
            setState((s) => ({
              ...s,
              address: next.address,
              provider: next.provider,
              signer: next.wrongNetwork ? null : next.signer,
              wrongNetwork: next.wrongNetwork,
              isConnecting: false,
              error: next.wrongNetwork ? KITE_STAY_ON_TESTNET_MESSAGE : null,
            }))
          } catch {
            disconnect()
          }
          return
        }
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

    /**
     * EIP-1193 `chainChanged` (MetaMask: same provider as `window.ethereum` when MetaMask is selected).
     * If the user leaves Kite (2368), block signing immediately and prompt switch back to Kite.
     */
    const onChainChanged = (chainIdHex: unknown) => {
      void (async () => {
        const id = parseChainIdHex(chainIdHex)
        if (id === KITE_CHAIN.id) {
          await refreshFromProvider()
          return
        }

        let hasSession = false
        try {
          const accounts = (await eth.request({ method: 'eth_accounts' })) as unknown
          hasSession = Array.isArray(accounts) && accounts.length > 0
        } catch {
          hasSession = false
        }

        if (!hasSession) {
          return
        }

        const provider = new ethers.BrowserProvider(eth)
        setState((s) => ({
          ...s,
          provider,
          signer: null,
          wrongNetwork: true,
          isConnecting: true,
          error: KITE_STAY_ON_TESTNET_MESSAGE,
        }))

        try {
          await requestSwitchToKiteChain(eth)
          const next = await readKiteWalletState(eth)
          applyKiteState(next)
        } catch {
          setState((s) => ({
            ...s,
            signer: null,
            wrongNetwork: true,
            isConnecting: false,
            error: KITE_STAY_ON_TESTNET_MESSAGE,
          }))
        }
      })()
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

  return { ...state, connect, disconnect, switchToKite }
}

// KiteDesk | resolve MetaMask EIP-1193 provider when multiple wallets inject window.ethereum

import type { Eip1193Provider } from 'ethers'

export type BrowserEip1193Provider = Eip1193Provider & {
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
  isMetaMask?: boolean
  providers?: BrowserEip1193Provider[]
}

export function getPreferredEip1193Provider(): BrowserEip1193Provider | undefined {
  if (typeof window === 'undefined') return undefined
  const root = window.ethereum as BrowserEip1193Provider | undefined
  if (!root?.request) return undefined

  const list = root.providers
  if (Array.isArray(list) && list.length > 0) {
    const metaMask = list.find((p) => p?.isMetaMask === true && typeof p.request === 'function')
    if (metaMask) return metaMask as BrowserEip1193Provider
    const first = list.find((p) => typeof p?.request === 'function')
    if (first) return first as BrowserEip1193Provider
  }

  return root
}

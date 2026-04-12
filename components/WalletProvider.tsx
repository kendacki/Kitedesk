// KiteDesk | wallet state lifted so / ↔ /desk client navigations keep the session
'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useWallet as useWalletState } from '@/hooks/useWallet'

type Wallet = ReturnType<typeof useWalletState>

const WalletContext = createContext<Wallet | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWalletState()
  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
}

export function useWallet(): Wallet {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return ctx
}

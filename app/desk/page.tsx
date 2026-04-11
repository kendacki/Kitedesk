// KiteDesk | full product console (wallet, tasks, attestations) — unchanged behavior from previous home route
import type { Metadata } from 'next'
import { KiteDeskApp } from '@/components/KiteDeskApp'

export const metadata: Metadata = {
  title: 'Console — KiteDesk',
  description:
    'Connect MetaMask, pay USDT on Kite testnet, run AI tasks, and view attestations.',
}

export default function DeskPage() {
  return (
    <div className="min-h-screen bg-kite-bg text-kite-muted">
      <KiteDeskApp />
    </div>
  )
}

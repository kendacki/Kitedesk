// KiteDesk | full product console — brand shell matches landing (emerald, logo, motion)
import type { Metadata } from 'next'
import { KiteDeskApp } from '@/components/KiteDeskApp'

export const metadata: Metadata = {
  title: 'Console — KiteDesk',
  description:
    'Connect MetaMask, pay USDT on Kite testnet, run AI tasks, and view attestations.',
}

export default function DeskPage() {
  return (
    <div className="relative min-h-[100dvh] bg-kite-bg text-foreground">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(6,78,59,0.25),transparent_55%)]"
        aria-hidden
      />
      <KiteDeskApp />
    </div>
  )
}

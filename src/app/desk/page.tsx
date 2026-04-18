// KiteDesk | console — white theme + soft emerald wash (matches landing)
import type { Metadata } from 'next'
import { KiteDeskApp } from '@/components/KiteDeskApp'

export const metadata: Metadata = {
  title: 'Console',
  description:
    'Fund a USDT budget on Kite testnet; the agent plans, pays APIs via x402 on the execution path, and attests on-chain.',
}

export default function DeskPage() {
  return (
    <div className="relative min-h-[100dvh] bg-kite-bg text-foreground">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.1)_0%,_transparent_55%)]"
        aria-hidden
      />
      <KiteDeskApp />
    </div>
  )
}

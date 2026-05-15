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
    <div className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12)_0%,_transparent_34%),linear-gradient(180deg,_#ffffff_0%,_#f7fbf9_100%)] text-foreground">
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.72)_0%,_rgba(255,255,255,0.18)_40%,_transparent_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/20 blur-3xl"
        aria-hidden
      />
      <KiteDeskApp />
    </div>
  )
}

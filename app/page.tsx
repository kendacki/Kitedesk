// KiteDesk | marketing landing at / — product console lives at /desk
import type { Metadata } from 'next'
import { LottieBackground } from '@/components/LottieBackground'
import { MarketingHome } from '@/components/landing/MarketingHome'

export const metadata: Metadata = {
  title: {
    absolute: 'KiteDesk — Autonomous AI Agents & Agentic Commerce on Kite',
  },
  description:
    'AI agents that plan, pay for APIs via x402, and execute under budget on Kite testnet — every step verifiable on-chain.',
}

export default function Home() {
  return (
    <div className="relative isolate min-h-screen bg-kite-bg text-kite-muted">
      <LottieBackground />
      <div className="relative z-10">
        <MarketingHome />
      </div>
    </div>
  )
}

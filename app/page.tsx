// KiteDesk | marketing landing at / — product console lives at /desk
import type { Metadata } from 'next'
import { LottieBackground } from '@/components/LottieBackground'
import { MarketingHome } from '@/components/landing/MarketingHome'

export const metadata: Metadata = {
  title: 'KiteDesk — Secure Web3 AI Tasks & On-Chain Attestation',
  description:
    'AI agents do the work; blockchain proves it. USDT-secured tasks with instant, verifiable on-chain receipts for every milestone on Kite testnet.',
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

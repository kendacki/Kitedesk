// KiteDesk | marketing landing at / — product console lives at /desk
import type { Metadata } from 'next'
import { LottieBackground } from '@/components/LottieBackground'
import { MarketingHome } from '@/components/landing/MarketingHome'

export const metadata: Metadata = {
  title: 'KiteDesk — Secure Web3 AI Tasks & On-Chain Attestation',
  description:
    'USDT payments on Kite testnet, Groq agents, and cryptographic attestations for trust-minimized freelance AI delivery.',
}

export default function Home() {
  return (
    <div className="relative min-h-screen text-kite-muted">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-kite-bg"
        aria-hidden
      />
      <LottieBackground />
      <div className="relative z-10">
        <MarketingHome />
      </div>
    </div>
  )
}

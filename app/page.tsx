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
    <div className="relative isolate min-h-screen bg-kite-bg text-kite-muted">
      <LottieBackground />
      <div className="relative z-10">
        <MarketingHome />
      </div>
    </div>
  )
}

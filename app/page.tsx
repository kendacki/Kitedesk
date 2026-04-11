// KiteDesk | marketing landing at / — product console lives at /desk
import type { Metadata } from 'next'
import { MarketingHome } from '@/components/landing/MarketingHome'

export const metadata: Metadata = {
  title: 'KiteDesk — Secure Web3 AI Tasks & On-Chain Attestation',
  description:
    'USDT payments on Kite testnet, Groq agents, and cryptographic attestations for trust-minimized freelance AI delivery.',
}

export default function Home() {
  return <MarketingHome />
}

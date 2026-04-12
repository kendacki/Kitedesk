// KiteDesk | root layout, fonts, metadata

import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { jetbrainsMono, poppins } from '@/lib/fonts'
import './globals.css'

const defaultSite = 'https://kitedesk.agiwithai.com'

function metadataBaseUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (raw) {
    try {
      const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
      u.pathname = '/'
      return u
    } catch {
      /* use default */
    }
  }
  return new URL(`${defaultSite}/`)
}

const title = 'KiteDesk: Autonomous AI Agents & Agentic Commerce on Kite'
const description =
  'AI agents that plan, pay for APIs via x402, and execute under budget on Kite testnet; verifiable on-chain.'

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: {
    default: title,
    template: '%s | KiteDesk',
  },
  description,
  applicationName: 'KiteDesk',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'KiteDesk',
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${jetbrainsMono.variable} min-h-[100dvh] font-sans antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  )
}

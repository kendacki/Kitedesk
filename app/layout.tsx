// KiteDesk | root layout, fonts, metadata

import type { Metadata, Viewport } from 'next'
import { jetbrainsMono, poppins } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'KiteDesk — Pay-Per-Task Autonomous AI Agent',
  description:
    'Pay USDT on Kite AI blockchain to run autonomous AI agent tasks with on-chain attestation.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
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
      </body>
    </html>
  )
}

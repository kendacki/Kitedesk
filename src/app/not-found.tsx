// KiteDesk | 404 — same brand as landing (logo, fonts, emerald CTAs)
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page not found · KiteDesk',
  description: 'The page you requested does not exist.',
  robots: { index: false, follow: false },
}
import { KitedeskLogoMark } from '@/components/landing/KitedeskLogoMark'
import { brandPrimaryCtaMarketing, brandSecondaryCtaMarketing } from '@/lib/brand'

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white font-sans text-slate-900">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <KitedeskLogoMark size={52} className="mb-8" />
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800/80">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-slate-600">
          That route does not exist. Head back to the landing page or open the console.
        </p>
        <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className={`${brandSecondaryCtaMarketing} w-full sm:w-auto`}>
            Home
          </Link>
          <Link href="/desk" className={`${brandPrimaryCtaMarketing} w-full sm:w-auto`}>
            Open console
          </Link>
        </div>
      </main>
    </div>
  )
}

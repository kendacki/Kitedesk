// KiteDesk | phone-only sticky dock: quick anchors + launch app
'use client'

import Link from 'next/link'

const itemClass =
  'flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-semibold leading-tight text-slate-600 transition active:bg-emerald-50 active:text-emerald-900 sm:text-xs'

export function MobileLandingDock() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden"
      aria-label="Mobile sections"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between safe-x">
        <button
          type="button"
          className={itemClass}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Top
        </button>
        <a href="#product" className={itemClass}>
          Product
        </a>
        <a href="#how" className={itemClass}>
          Flow
        </a>
        <Link href="/desk" className={`${itemClass} text-emerald-800`} prefetch>
          Console
        </Link>
      </div>
    </nav>
  )
}

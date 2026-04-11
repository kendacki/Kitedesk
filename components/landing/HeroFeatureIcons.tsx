// KiteDesk | hero pill icons (replace ✓) — payments & on-chain attestation
'use client'

const base = 'h-4 w-4 shrink-0 text-emerald-600'

/** Card / settlement — milestone-based payments */
export function IconMilestonePayments({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? base}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-18.75 3.75v10.125a2.25 2.25 0 002.25 2.25h9.75a2.25 2.25 0 002.25-2.25V12.75m-18.75 3.75h19.5m-18.75 3.75h19.5"
      />
    </svg>
  )
}

/** Chain link — attested outputs on-chain */
export function IconOnChainAttestation({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? base}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622.621-.621a4.5 4.5 0 00-6.364-6.364l-1.757 1.757"
      />
    </svg>
  )
}

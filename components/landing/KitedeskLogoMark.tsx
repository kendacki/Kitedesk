// KiteDesk | brand mark (vector); optional PNG: public/images/kitedesk-logo.png
'use client'

type Props = {
  className?: string
  size?: number
}

export function KitedeskLogoMark({ className = '', size = 40 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <title>KiteDesk</title>
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="currentColor"
        strokeWidth="4"
        className="text-slate-900"
        fill="none"
      />
      <path
        fill="currentColor"
        className="text-slate-900"
        d="M32 12c-6 10-6 20 0 30l6-10-6-20zm10 8l8 14-8 14-6-10 6-18zm-20 0l-8 14 8 14 6-10-6-18z"
        opacity="0.85"
      />
    </svg>
  )
}

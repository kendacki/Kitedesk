// KiteDesk | brand mark (transparent PNG: public/images/kitedesk-logo.png)
'use client'

import Image from 'next/image'

type Props = {
  className?: string
  size?: number
  /** Use on dark backgrounds so the black mark reads as light */
  invert?: boolean
  /** Pin artwork to the left inside the frame (optical flush-left with text) */
  alignMarkLeft?: boolean
}

export function KitedeskLogoMark({
  className = '',
  size = 40,
  invert = false,
  alignMarkLeft = false,
}: Props) {
  return (
    <span
      className={`inline-flex shrink-0 ${invert ? 'brightness-0 invert' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/kitedesk-logo.png"
        alt="KiteDesk"
        width={size}
        height={size}
        className={`h-full w-full object-contain ${alignMarkLeft ? 'object-left' : ''}`}
        priority
      />
    </span>
  )
}

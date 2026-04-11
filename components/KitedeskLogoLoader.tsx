// KiteDesk | spinning logo for loading states
'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

type Props = {
  className?: string
  size?: number
  /** Use on dark backgrounds so the black mark reads as light */
  invert?: boolean
}

export function KitedeskLogoLoader({ className = '', size = 48, invert = false }: Props) {
  return (
    <motion.div
      className={`inline-flex shrink-0 ${invert ? 'brightness-0 invert' : ''} ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      aria-hidden
    >
      <Image
        src="/images/kitedesk-logo.png"
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
        priority={false}
      />
    </motion.div>
  )
}

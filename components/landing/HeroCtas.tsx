// KiteDesk | hero CTAs using Stitches buttons + framer-motion + router
'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PrimaryButton, SecondaryButton } from '@/components/landing/ui'

const MotionPrimary = motion(PrimaryButton)
const MotionSecondary = motion(SecondaryButton)

export function HeroCtas() {
  const router = useRouter()

  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <MotionPrimary
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="min-w-[200px]"
        onClick={() => router.push('/desk')}
      >
        Start a task
      </MotionPrimary>
      <MotionSecondary
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="min-w-[200px]"
        onClick={() =>
          document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })
        }
      >
        See the flow
      </MotionSecondary>
    </div>
  )
}

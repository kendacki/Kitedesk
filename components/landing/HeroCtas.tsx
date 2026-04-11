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
    <div className="mt-3 flex w-full max-w-md flex-col items-stretch justify-start gap-3 sm:mt-4 sm:max-w-none sm:flex-row sm:items-center sm:justify-start sm:gap-4">
      <MotionPrimary
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="min-h-[48px] w-full min-w-0 sm:min-w-[200px] sm:w-auto"
        onClick={() => router.push('/desk')}
      >
        Start a task
      </MotionPrimary>
      <MotionSecondary
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="min-h-[48px] w-full min-w-0 sm:min-w-[200px] sm:w-auto"
        onClick={() =>
          document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })
        }
      >
        See the flow
      </MotionSecondary>
    </div>
  )
}

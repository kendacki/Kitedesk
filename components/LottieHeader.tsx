'use client'

import React from 'react'
import Lottie from 'lottie-react'
import animationData from './PulsePreloaderData.json'

/** Pulse animation behind hero copy — layout/spacing for text lives in `MarketingHome` only. */
export function LottieHeader() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden opacity-60">
      <div className="h-64 w-64 md:h-96 md:w-96">
        <Lottie animationData={animationData} loop={true} autoplay={true} />
      </div>
    </div>
  )
}

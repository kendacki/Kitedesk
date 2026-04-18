'use client'

import React from 'react'
import Lottie from 'lottie-react'
import animationData from './WhitePulse.json'

export function LottieBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {/* Temporarily removed mix-blend-screen and opacity constraints to guarantee visibility.
        If the background is white and the animation is white, we apply a temporary invert filter so we can actually see it.
      */}
      <div className="h-full w-full scale-150 opacity-80 invert dark:invert-0 md:scale-100">
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  )
}

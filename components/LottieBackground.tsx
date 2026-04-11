'use client'

import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

const ANIMATION_URL = '/White%20Pulse%20Animation.json'

export function LottieBackground() {
  const [animationData, setAnimationData] = useState<object | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(ANIMATION_URL)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setAnimationData(data)
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!animationData) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40 mix-blend-screen"
      aria-hidden
    >
      <Lottie
        animationData={animationData}
        loop
        autoplay
        className="h-full w-full scale-150 object-cover md:scale-100"
      />
    </div>
  )
}

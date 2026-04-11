// KiteDesk | Stitches theme and primitives for marketing landing
import { createStitches } from '@stitches/react'

export const { styled, css, keyframes, theme, getCssText } = createStitches({
  theme: {
    colors: {
      forest: '#064e3b',
      emerald: '#10b981',
      white: '#ffffff',
      muted: '#64748b',
      ink: '#0f172a',
    },
    radii: {
      md: '10px',
      lg: '14px',
      xl: '24px',
      '2xl': '32px',
    },
    fontSizes: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
  },
  media: {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
  },
})

export const gradientBg = 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)'

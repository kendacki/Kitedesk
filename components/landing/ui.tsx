// KiteDesk | Stitches button variants for marketing landing
'use client'

import { styled } from '@/stitches.config'

const deepGreen = 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)'

const poppinsStack = 'var(--font-poppins), system-ui, sans-serif'

export const PrimaryButton = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.5rem',
  borderRadius: '$lg',
  fontFamily: poppinsStack,
  fontWeight: 600,
  fontSize: '$base',
  color: '#ffffff',
  backgroundImage: deepGreen,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  '&:focus-visible': {
    outline: '2px solid #10b981',
    outlineOffset: '2px',
  },
})

export const SecondaryButton = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.5rem',
  borderRadius: '$lg',
  fontFamily: poppinsStack,
  fontWeight: 600,
  fontSize: '$base',
  color: '#064e3b',
  backgroundColor: 'transparent',
  border: '2px solid #064e3b',
  transition:
    'transform 0.2s ease, background-image 0.2s ease, color 0.2s ease, border-color 0.2s ease',
  '&:hover': {
    backgroundImage: deepGreen,
    color: '#ffffff',
    borderColor: 'transparent',
  },
  '&:focus-visible': {
    outline: '2px solid #10b981',
    outlineOffset: '2px',
  },
})

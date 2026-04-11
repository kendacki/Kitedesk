// KiteDesk | Tailwind theme aligned with KiteDesk design tokens

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '475px',
      },
      backgroundImage: {
        'deep-green-gradient': 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        kite: {
          bg: 'var(--bg-primary)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          border: 'var(--border)',
          muted: 'var(--text-secondary)',
          accent: 'var(--accent-primary)',
          success: 'var(--accent-success)',
          usdt: 'var(--usdt-green)',
        },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config

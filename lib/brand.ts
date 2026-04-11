// KiteDesk | shared UI tokens (marketing + /desk) — colours, buttons, links

/** Primary CTA — emerald gradient (light or dark surfaces) */
export const brandPrimaryButton =
  'inline-flex min-h-[44px] items-center justify-center rounded-md bg-gradient-to-br from-emerald-900 to-emerald-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40'

/** Secondary — for light backgrounds (landing) */
export const brandSecondaryButtonLight =
  'inline-flex min-h-[44px] items-center justify-center rounded-md border-2 border-emerald-900 bg-transparent px-6 py-3 text-center text-sm font-semibold text-emerald-900 transition hover:bg-emerald-950/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-40'

/** Secondary — for dark surfaces (/desk) */
export const brandSecondaryButtonDark =
  'inline-flex min-h-[44px] items-center justify-center rounded-md border-2 border-emerald-700 bg-transparent px-4 py-2.5 text-center text-sm font-semibold text-emerald-200 transition hover:border-emerald-500 hover:text-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-40'

/** Inline / nav links on dark UI */
export const brandLinkDark = 'text-emerald-400 transition hover:text-emerald-300'

/** Accent text (headings, labels on desk) */
export const brandAccentText = 'text-emerald-400'

/** Framer Motion easing (matches landing) */
export const brandEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

/** Marketing header CTAs (min width matches original landing) */
export const brandPrimaryCtaMarketing = `${brandPrimaryButton} min-w-[160px]`
export const brandSecondaryCtaMarketing = `${brandSecondaryButtonLight} min-w-[160px]`

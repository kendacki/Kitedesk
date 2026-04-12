// KiteDesk | animated agent execution pipeline for marketing (Framer Motion + Tailwind)
'use client'

import { useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { brandEase } from '@/lib/brand'

export type AgentExecutionDiagramProps = {
  className?: string
}

const stagger = 0.12
const nodeView = { once: true, margin: '-40px' } as const

function GradientFrame({
  children,
  variant = 'default',
  className = '',
}: {
  children: ReactNode
  variant?: 'default' | 'x402'
  className?: string
}) {
  const grad =
    variant === 'x402'
      ? 'from-amber-400/55 via-emerald-500/45 to-amber-600/40 shadow-amber-500/15'
      : 'from-emerald-400/45 via-slate-500/25 to-teal-900/45 shadow-emerald-900/20'
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-px shadow-lg ${grad} ${className}`}
    >
      <div className="rounded-[15px] bg-slate-950/88 px-4 py-3.5 backdrop-blur-xl sm:px-5 sm:py-4">
        {children}
      </div>
    </div>
  )
}

function FlowLine({
  orientation,
  gradientId,
}: {
  orientation: 'horizontal' | 'vertical'
  gradientId: string
}) {
  const dashAnimate = {
    strokeDashoffset: [0, -28],
  }
  const dashTransition = {
    duration: 1.8,
    repeat: Infinity,
    ease: 'linear' as const,
  }

  if (orientation === 'horizontal') {
    return (
      <svg
        className="h-8 w-full min-w-[2rem] max-w-[2.75rem] shrink text-emerald-400/90 lg:max-w-[3rem] xl:max-w-[3.5rem]"
        viewBox="0 0 64 24"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <motion.line
          x1="2"
          y1="12"
          x2="62"
          y2="12"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="5 7"
          vectorEffect="nonScalingStroke"
          initial={{ strokeDashoffset: 0 }}
          animate={dashAnimate}
          transition={dashTransition}
        />
        <polygon points="58,8 64,12 58,16" fill="#34d399" fillOpacity="0.85" />
      </svg>
    )
  }

  return (
    <svg
      className="h-14 w-8 shrink-0 text-emerald-400/90"
      viewBox="0 0 24 56"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <motion.line
        x1="12"
        y1="2"
        x2="12"
        y2="50"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 7"
        vectorEffect="nonScalingStroke"
        initial={{ strokeDashoffset: 0 }}
        animate={dashAnimate}
        transition={dashTransition}
      />
      <polygon points="8,46 12,54 16,46" fill="#34d399" fillOpacity="0.85" />
    </svg>
  )
}

export function AgentExecutionDiagram({ className = '' }: AgentExecutionDiagramProps) {
  const uid = useId().replace(/:/g, '')
  const h1 = `${uid}-h1`
  const h2 = `${uid}-h2`
  const h3 = `${uid}-h3`
  const h4 = `${uid}-h4`
  const v1 = `${uid}-v1`
  const v2 = `${uid}-v2`
  const v3 = `${uid}-v3`
  const v4 = `${uid}-v4`

  const item = (i: number) => ({
    initial: { opacity: 0, y: 22, scale: 0.98 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: nodeView,
    transition: { delay: i * stagger, duration: 0.5, ease: brandEase },
  })

  return (
    <div className={`w-full ${className}`.trim()} data-agent-execution-diagram>
      <div className="flex flex-col items-center gap-0 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
        {/* 1 Trigger */}
        <motion.div {...item(0)} className="w-full max-w-xs shrink-0 lg:w-40 xl:w-48">
          <GradientFrame>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
              Trigger
            </p>
            <p className="mt-2 text-sm font-semibold leading-snug text-slate-100">
              Goal: &ldquo;Find the best GPU under $500&rdquo;
            </p>
          </GradientFrame>
        </motion.div>

        <div className="flex justify-center lg:hidden" aria-hidden>
          <FlowLine orientation="vertical" gradientId={v1} />
        </div>
        <div className="hidden w-8 shrink-0 items-center justify-center sm:w-10 lg:flex xl:w-12">
          <FlowLine orientation="horizontal" gradientId={h1} />
        </div>

        {/* 2 Agent logic */}
        <motion.div {...item(1)} className="w-full max-w-xs shrink-0 lg:w-40 xl:w-48">
          <GradientFrame>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
              Agent logic
            </p>
            <ul className="mt-2 space-y-1.5 text-xs font-normal leading-relaxed text-slate-300/95 sm:text-sm">
              <li className="flex gap-2">
                <span className="text-emerald-500/80">→</span>
                Searches APIs &amp; data sources
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500/80">→</span>
                Evaluates cost per call
              </li>
            </ul>
          </GradientFrame>
        </motion.div>

        <div className="flex justify-center lg:hidden" aria-hidden>
          <FlowLine orientation="vertical" gradientId={v2} />
        </div>
        <div className="hidden w-8 shrink-0 items-center justify-center sm:w-10 lg:flex xl:w-12">
          <FlowLine orientation="horizontal" gradientId={h2} />
        </div>

        {/* 3 x402 */}
        <motion.div
          {...item(2)}
          className="relative w-full max-w-xs shrink-0 lg:w-40 xl:w-48"
        >
          <motion.div
            className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-400/30 via-emerald-400/25 to-amber-500/30 opacity-80 blur-md"
            animate={{
              opacity: [0.45, 0.95, 0.45],
              scale: [1, 1.03, 1],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            aria-hidden
          />
          <div className="relative">
            <GradientFrame variant="x402">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/95">
                Transaction
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-100">
                Pays via{' '}
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-amber-200 ring-1 ring-amber-400/35">
                  x402
                </span>
              </p>
              <p className="mt-1.5 text-[11px] font-normal text-slate-400">
                Machine-native settlement on the execution path
              </p>
            </GradientFrame>
          </div>
        </motion.div>

        <div className="flex justify-center lg:hidden" aria-hidden>
          <FlowLine orientation="vertical" gradientId={v3} />
        </div>
        <div className="hidden w-8 shrink-0 items-center justify-center sm:w-10 lg:flex xl:w-12">
          <FlowLine orientation="horizontal" gradientId={h3} />
        </div>

        {/* 4 Resolution */}
        <motion.div {...item(3)} className="w-full max-w-xs shrink-0 lg:w-40 xl:w-48">
          <GradientFrame>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
              Resolution
            </p>
            <ul className="mt-2 space-y-1.5 text-xs font-normal leading-relaxed text-slate-300/95 sm:text-sm">
              <li className="flex gap-2">
                <span className="text-emerald-500/80">→</span>
                Retrieves specs &amp; evidence
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500/80">→</span>
                Confirms budget constraint
              </li>
            </ul>
          </GradientFrame>
        </motion.div>

        <div className="flex justify-center lg:hidden" aria-hidden>
          <FlowLine orientation="vertical" gradientId={v4} />
        </div>
        <div className="hidden w-8 shrink-0 items-center justify-center sm:w-10 lg:flex xl:w-12">
          <FlowLine orientation="horizontal" gradientId={h4} />
        </div>

        {/* Receipt */}
        <motion.div {...item(4)} className="w-full max-w-xs shrink-0 lg:w-36 xl:w-40">
          <div className="rounded-2xl border border-dashed border-emerald-500/35 bg-gradient-to-b from-slate-950/95 to-slate-900/90 p-px shadow-lg shadow-emerald-950/30">
            <div className="rounded-[15px] bg-black/50 px-4 py-3.5 font-mono backdrop-blur-sm sm:py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-500/80">
                Receipt
              </p>
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-slate-300 sm:text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Total API Spend</span>
                  <span className="font-semibold tabular-nums text-emerald-400">
                    $0.12
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Budget Saved</span>
                  <span className="font-semibold tabular-nums text-slate-100">
                    $0.38
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

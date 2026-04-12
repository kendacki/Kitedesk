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

/** Primary marketing node shell: theme `deep-green-gradient` + emerald-tinted depth */
function NodeShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl bg-deep-green-gradient px-4 py-3.5 font-sans text-white shadow-lg shadow-emerald-900/45 ring-1 ring-emerald-950/25 sm:px-5 sm:py-4 ${className}`.trim()}
    >
      {children}
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
    strokeDashoffset: [0, -38],
  }
  const dashTransition = {
    duration: 1.8,
    repeat: Infinity,
    ease: 'linear' as const,
  }

  if (orientation === 'horizontal') {
    return (
      <svg
        className="h-10 w-full min-w-[2.5rem] max-w-[3.25rem] shrink lg:max-w-[3.75rem] xl:max-w-[4.25rem]"
        viewBox="0 0 72 28"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <motion.line
          x1="3"
          y1="14"
          x2="66"
          y2="14"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="8 10"
          vectorEffect="nonScalingStroke"
          initial={{ strokeDashoffset: 0 }}
          animate={dashAnimate}
          transition={dashTransition}
        />
        <polygon points="62,9 72,14 62,19" fill="#10b981" fillOpacity="0.9" />
      </svg>
    )
  }

  return (
    <svg
      className="h-[4.25rem] w-10 shrink-0"
      viewBox="0 0 28 68"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#064e3b" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <motion.line
        x1="14"
        y1="3"
        x2="14"
        y2="60"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 10"
        vectorEffect="nonScalingStroke"
        initial={{ strokeDashoffset: 0 }}
        animate={dashAnimate}
        transition={dashTransition}
      />
      <polygon points="9,56 14,66 19,56" fill="#10b981" fillOpacity="0.9" />
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
    <div
      className={`w-full font-sans text-white ${className}`.trim()}
      data-agent-execution-diagram
    >
      <div className="flex flex-col items-center gap-0 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
        {/* 1 Trigger */}
        <motion.div {...item(0)} className="w-full max-w-xs shrink-0 lg:w-40 xl:w-48">
          <NodeShell>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              Trigger
            </p>
            <p className="mt-2 text-sm font-semibold leading-snug text-white">
              Goal: &ldquo;Find the best GPU under $500&rdquo;
            </p>
          </NodeShell>
        </motion.div>

        <div className="flex justify-center py-2 lg:hidden" aria-hidden>
          <FlowLine orientation="vertical" gradientId={v1} />
        </div>
        <div className="hidden min-h-[3.5rem] w-12 shrink-0 items-center justify-center px-2 sm:w-14 lg:flex xl:w-16 xl:px-3">
          <FlowLine orientation="horizontal" gradientId={h1} />
        </div>

        {/* 2 Agent logic */}
        <motion.div {...item(1)} className="w-full max-w-xs shrink-0 lg:w-40 xl:w-48">
          <NodeShell>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              Agent logic
            </p>
            <ul className="mt-2 space-y-1.5 text-xs font-normal leading-relaxed text-white sm:text-sm">
              <li className="flex gap-2">
                <span className="shrink-0 font-semibold text-white" aria-hidden>
                  →
                </span>
                Searches APIs &amp; data sources
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-semibold text-white" aria-hidden>
                  →
                </span>
                Evaluates cost per call
              </li>
            </ul>
          </NodeShell>
        </motion.div>

        <div className="flex justify-center py-2 lg:hidden" aria-hidden>
          <FlowLine orientation="vertical" gradientId={v2} />
        </div>
        <div className="hidden min-h-[3.5rem] w-12 shrink-0 items-center justify-center px-2 sm:w-14 lg:flex xl:w-16 xl:px-3">
          <FlowLine orientation="horizontal" gradientId={h2} />
        </div>

        {/* 3 x402 */}
        <motion.div
          {...item(2)}
          className="relative w-full max-w-xs shrink-0 lg:w-40 xl:w-48"
        >
          <motion.div
            className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-300/35 via-emerald-400/30 to-teal-300/35 opacity-90 blur-md"
            animate={{
              opacity: [0.5, 0.95, 0.5],
              scale: [1, 1.04, 1],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            aria-hidden
          />
          <div className="relative">
            <NodeShell className="shadow-emerald-950/50 ring-white/15">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                Transaction
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Pays via{' '}
                <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-sm font-semibold tracking-wide text-white ring-1 ring-white/30">
                  x402
                </span>
              </p>
              <p className="mt-1.5 text-[11px] font-normal leading-snug text-white/95">
                Machine-native settlement on the execution path
              </p>
            </NodeShell>
          </div>
        </motion.div>

        <div className="flex justify-center py-2 lg:hidden" aria-hidden>
          <FlowLine orientation="vertical" gradientId={v3} />
        </div>
        <div className="hidden min-h-[3.5rem] w-12 shrink-0 items-center justify-center px-2 sm:w-14 lg:flex xl:w-16 xl:px-3">
          <FlowLine orientation="horizontal" gradientId={h3} />
        </div>

        {/* 4 Resolution */}
        <motion.div {...item(3)} className="w-full max-w-xs shrink-0 lg:w-40 xl:w-48">
          <NodeShell>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              Resolution
            </p>
            <ul className="mt-2 space-y-1.5 text-xs font-normal leading-relaxed text-white sm:text-sm">
              <li className="flex gap-2">
                <span className="shrink-0 font-semibold text-white" aria-hidden>
                  →
                </span>
                Retrieves specs &amp; evidence
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-semibold text-white" aria-hidden>
                  →
                </span>
                Confirms budget constraint
              </li>
            </ul>
          </NodeShell>
        </motion.div>

        <div className="flex justify-center py-2 lg:hidden" aria-hidden>
          <FlowLine orientation="vertical" gradientId={v4} />
        </div>
        <div className="hidden min-h-[3.5rem] w-12 shrink-0 items-center justify-center px-2 sm:w-14 lg:flex xl:w-16 xl:px-3">
          <FlowLine orientation="horizontal" gradientId={h4} />
        </div>

        {/* Receipt: same primary gradient + dark overlay */}
        <motion.div {...item(4)} className="w-full max-w-xs shrink-0 lg:w-36 xl:w-40">
          <div className="relative overflow-hidden rounded-2xl shadow-lg shadow-emerald-900/50 ring-1 ring-emerald-950/35">
            <div className="absolute inset-0 bg-deep-green-gradient" aria-hidden />
            <div className="absolute inset-0 bg-black/48" aria-hidden />
            <div className="relative z-10 px-4 py-3.5 sm:py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white">
                Receipt
              </p>
              <div className="mt-3 space-y-2 border-t border-white/25 pt-3 text-[11px] leading-relaxed text-white sm:text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-white/95">Total API Spend</span>
                  <span className="font-semibold tabular-nums text-white">$0.12</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/95">Budget Saved</span>
                  <span className="font-semibold tabular-nums text-white">$0.38</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

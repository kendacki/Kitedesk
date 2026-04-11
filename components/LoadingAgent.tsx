// KiteDesk | loading stages (logo + emerald accents)
'use client'

import { motion } from 'framer-motion'
import { KitedeskLogoLoader } from '@/components/KitedeskLogoLoader'
import { brandEase } from '@/lib/brand'
import type { ExecutionStatus } from '@/hooks/useTaskExecution'

type LoadingAgentProps = {
  status: ExecutionStatus
}

const STAGES: {
  key: 'paying' | 'executing' | 'attesting'
  label: string
  detail: string
}[] = [
  {
    key: 'paying',
    label: 'Paying',
    detail: 'Confirming payment on Kite chain…',
  },
  {
    key: 'executing',
    label: 'Executing',
    detail: 'Agent is working…',
  },
  {
    key: 'attesting',
    label: 'Attesting',
    detail: 'Writing proof to Kite chain…',
  },
]

export function LoadingAgent({ status }: LoadingAgentProps) {
  if (status === 'idle' || status === 'done' || status === 'error') {
    return null
  }

  const activeIndex = status === 'paying' ? 0 : status === 'executing' ? 1 : 2

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: brandEase }}
      className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-lg shadow-emerald-950/20 backdrop-blur-sm sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 flex items-center gap-3">
        <KitedeskLogoLoader size={40} invert />
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-emerald-400">
          In progress
        </p>
      </div>
      <ul className="space-y-4">
        {STAGES.map((stage, i) => {
          const active = i === activeIndex
          const done = i < activeIndex
          return (
            <li
              key={stage.key}
              className={`flex gap-3 ${active ? 'opacity-100' : 'opacity-50'}`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  done
                    ? 'bg-emerald-400'
                    : active
                      ? 'animate-pulse bg-emerald-400'
                      : 'bg-white/20'
                }`}
              />
              <div>
                <p className="font-sans text-sm font-medium text-white">{stage.label}</p>
                <p className="font-sans text-xs text-slate-400">{stage.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}

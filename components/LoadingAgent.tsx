// KiteDesk | loading stages (light theme + logo)
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
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/50 sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 flex items-center gap-3">
        <KitedeskLogoLoader size={40} />
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-emerald-800">
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
                    ? 'bg-emerald-600'
                    : active
                      ? 'animate-pulse bg-emerald-500'
                      : 'bg-slate-300'
                }`}
              />
              <div>
                <p className="font-sans text-sm font-medium text-slate-900">{stage.label}</p>
                <p className="font-sans text-xs text-slate-600">{stage.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}

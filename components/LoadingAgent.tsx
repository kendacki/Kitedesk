// KiteDesk | loading stages for pay / agent / attestation
'use client'

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
    <div
      className="mt-6 rounded-lg border border-kite-border bg-kite-bg p-6"
      role="status"
      aria-live="polite"
    >
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-kite-accent">
        In progress
      </p>
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
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  done
                    ? 'bg-kite-success'
                    : active
                      ? 'animate-pulse bg-kite-accent'
                      : 'bg-kite-border'
                }`}
              />
              <div>
                <p className="font-mono text-sm text-foreground">{stage.label}</p>
                <p className="font-mono text-xs text-kite-muted">{stage.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

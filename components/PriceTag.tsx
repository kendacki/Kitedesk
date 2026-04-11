// KiteDesk | task price + duration (light theme)
'use client'

import { TASK_CONFIG } from '@/lib/constants'
import type { TaskType } from '@/types'

type PriceTagProps = {
  taskType: TaskType
}

export function PriceTag({ taskType }: PriceTagProps) {
  const cfg = TASK_CONFIG[taskType]
  return (
    <div className="flex flex-wrap items-center gap-3 font-sans text-sm text-slate-600">
      <span className="font-semibold text-emerald-800">{cfg.priceUsdt.toFixed(2)} USDT</span>
      <span className="text-slate-500">~ {cfg.estimatedTime}</span>
    </div>
  )
}

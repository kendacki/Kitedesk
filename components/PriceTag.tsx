// KiteDesk | show task price in USDT and estimated duration
'use client'

import { TASK_CONFIG } from '@/lib/constants'
import type { TaskType } from '@/types'

type PriceTagProps = {
  taskType: TaskType
}

export function PriceTag({ taskType }: PriceTagProps) {
  const cfg = TASK_CONFIG[taskType]
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-sm text-kite-muted">
      <span className="text-kite-usdt">{cfg.priceUsdt.toFixed(2)} USDT</span>
      <span className="text-kite-muted">~ {cfg.estimatedTime}</span>
    </div>
  )
}

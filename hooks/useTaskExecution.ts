// KiteDesk | client flow: pay USDT, call agent API, optional attesting UI beat
'use client'

import { useState } from 'react'
import axios from 'axios'
import { ethers } from 'ethers'
import { payForTask } from '@/lib/payment'
import { TASK_CONFIG } from '@/lib/constants'
import { appendTaskHistory } from '@/lib/taskHistory'
import type { TaskResult, TaskType } from '@/types'

export type ExecutionStatus =
  | 'idle'
  | 'paying'
  | 'executing'
  | 'attesting'
  | 'done'
  | 'error'

export function useTaskExecution() {
  const [status, setStatus] = useState<ExecutionStatus>('idle')
  const [result, setResult] = useState<TaskResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStatus('idle')
    setError(null)
    setResult(null)
  }

  const execute = async (
    signer: ethers.JsonRpcSigner,
    address: string,
    taskType: TaskType,
    prompt: string
  ) => {
    setStatus('idle')
    setError(null)
    setResult(null)

    try {
      const price = TASK_CONFIG[taskType].priceUsdt

      setStatus('paying')
      const paymentTxHash = await payForTask(signer, price)

      setStatus('executing')
      const { data } = await axios.post<{
        success?: boolean
        taskId?: string
        output?: string
        attestationHash?: string
        attestationUrl?: string
        error?: string
      }>('/api/agent', {
        taskType,
        prompt,
        userAddress: address,
        paymentTxHash,
      })

      if (data.error || !data.taskId || !data.output) {
        throw new Error(data.error || 'Agent request failed')
      }

      setStatus('attesting')
      await new Promise((r) => setTimeout(r, 450))

      const taskResult: TaskResult = {
        taskId: data.taskId,
        output: data.output,
        txHash: paymentTxHash,
        attestationHash: data.attestationHash ?? '',
        attestationUrl: data.attestationUrl ?? '',
        completedAt: Date.now(),
      }

      setResult(taskResult)
      appendTaskHistory({
        taskId: data.taskId,
        taskType,
        promptPreview: prompt.slice(0, 120),
        attestationUrl: taskResult.attestationUrl,
        completedAt: taskResult.completedAt,
      })

      setStatus('done')
    } catch (err: unknown) {
      setStatus('error')
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { error?: string })?.error || err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }
  }

  return { execute, reset, status, result, error }
}

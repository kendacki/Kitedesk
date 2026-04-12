// KiteDesk | client flow: pay USDT, call agent API, optional attesting UI beat
'use client'

import { useState } from 'react'
import axios from 'axios'
import { ethers } from 'ethers'
import { payForTask } from '@/lib/payment'
import { TASK_CONFIG } from '@/lib/constants'
import type { AgentStep, GoalResult, TaskResult, TaskType } from '@/types'

export type ClassicTaskType = Exclude<TaskType, 'goal'>

export type ExecutionStatus =
  | 'idle'
  | 'paying'
  | 'planning'
  | 'executing'
  | 'attesting'
  | 'done'
  | 'error'

function isWalletUserRejected(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as {
    code?: string | number
    message?: string
    info?: { error?: { code?: number; message?: string } }
  }
  if (e.code === 'ACTION_REJECTED' || e.code === 4001) return true
  if (e.info?.error?.code === 4001) return true
  const msg = (e.message || e.info?.error?.message || '').toLowerCase()
  if (msg.includes('user denied') || msg.includes('user rejected')) return true
  return false
}

function isSignerOrConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  return (
    lower.includes('signer') ||
    (lower.includes('wallet') && lower.includes('connect')) ||
    lower.includes('disconnected') ||
    lower.includes('extension id')
  )
}

export function useTaskExecution() {
  const [status, setStatus] = useState<ExecutionStatus>('idle')
  const [result, setResult] = useState<TaskResult | null>(null)
  const [goalResult, setGoalResult] = useState<GoalResult | null>(null)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [goalBudgetUsdt, setGoalBudgetUsdt] = useState<number | null>(null)
  const [isGoalFlow, setIsGoalFlow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStatus('idle')
    setError(null)
    setResult(null)
    setGoalResult(null)
    setSteps([])
    setGoalBudgetUsdt(null)
    setIsGoalFlow(false)
  }

  const execute = async (
    signer: ethers.JsonRpcSigner,
    address: string,
    taskType: ClassicTaskType,
    prompt: string
  ) => {
    setStatus('idle')
    setError(null)
    setResult(null)
    setGoalResult(null)
    setSteps([])
    setGoalBudgetUsdt(null)
    setIsGoalFlow(false)

    try {
      try {
        await signer.getAddress()
      } catch {
        setStatus('error')
        setError('Wallet disconnected. Refresh the page and connect your wallet again.')
        return
      }

      const price = TASK_CONFIG[taskType].priceUsdt

      setStatus('paying')
      let paymentTxHash: string
      try {
        paymentTxHash = await payForTask(signer, price)
      } catch (payErr: unknown) {
        if (isWalletUserRejected(payErr)) {
          setStatus('error')
          setError('Transaction was cancelled in your wallet.')
          return
        }
        if (isSignerOrConnectionError(payErr)) {
          setStatus('error')
          setError(
            'Wallet connection was lost. Refresh the page, reconnect MetaMask, and try again.'
          )
          return
        }
        throw payErr
      }

      setStatus('executing')
      let data: {
        success?: boolean
        taskId?: string
        output?: string
        attestationHash?: string
        attestationUrl?: string
        error?: string
      }
      try {
        const res = await axios.post<typeof data>('/api/agent', {
          taskType,
          prompt,
          userAddress: address,
          paymentTxHash,
        })
        data = res.data
      } catch (agentErr: unknown) {
        if (axios.isAxiosError(agentErr) && isWalletUserRejected(agentErr)) {
          setStatus('error')
          setError('Request was cancelled.')
          return
        }
        throw agentErr
      }

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
      setStatus('done')
    } catch (err: unknown) {
      setStatus('error')
      if (isWalletUserRejected(err)) {
        setError('Transaction was cancelled in your wallet.')
        return
      }
      if (axios.isAxiosError(err)) {
        const serverMsg = (err.response?.data as { error?: string })?.error
        setError(serverMsg || err.message)
        return
      }
      if (isSignerOrConnectionError(err)) {
        setError(
          'Wallet connection was lost. Refresh the page, reconnect MetaMask, and try again.'
        )
        return
      }
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const executeGoal = async (
    signer: ethers.JsonRpcSigner,
    address: string,
    goal: string,
    budgetUsdt: number
  ) => {
    setStatus('idle')
    setError(null)
    setResult(null)
    setGoalResult(null)
    setSteps([])
    setGoalBudgetUsdt(budgetUsdt)
    setIsGoalFlow(true)

    try {
      try {
        await signer.getAddress()
      } catch {
        setStatus('error')
        setError('Wallet disconnected. Refresh the page and connect your wallet again.')
        setIsGoalFlow(false)
        setGoalBudgetUsdt(null)
        return
      }

      setStatus('paying')
      let paymentTxHash: string
      try {
        paymentTxHash = await payForTask(signer, budgetUsdt)
      } catch (payErr: unknown) {
        if (isWalletUserRejected(payErr)) {
          setStatus('error')
          setError('Transaction was cancelled in your wallet.')
          setIsGoalFlow(false)
          setGoalBudgetUsdt(null)
          return
        }
        if (isSignerOrConnectionError(payErr)) {
          setStatus('error')
          setError(
            'Wallet connection was lost. Refresh the page, reconnect MetaMask, and try again.'
          )
          setIsGoalFlow(false)
          setGoalBudgetUsdt(null)
          return
        }
        throw payErr
      }

      setSteps([])
      setStatus('planning')
      await new Promise((r) => setTimeout(r, 280))

      setStatus('executing')
      let data: {
        success?: boolean
        taskId?: string
        goalResult?: GoalResult
        error?: string
      }
      try {
        const res = await axios.post<typeof data>('/api/agent', {
          taskType: 'goal',
          goal: goal.trim(),
          budgetUsdt,
          userAddress: address,
          paymentTxHash,
        })
        data = res.data
      } catch (agentErr: unknown) {
        if (axios.isAxiosError(agentErr) && isWalletUserRejected(agentErr)) {
          setStatus('error')
          setError('Request was cancelled.')
          setIsGoalFlow(false)
          setGoalBudgetUsdt(null)
          setSteps([])
          return
        }
        throw agentErr
      }

      if (data.error || !data.goalResult?.taskId) {
        throw new Error(data.error || 'Goal agent request failed')
      }

      const gr = data.goalResult
      setSteps(gr.steps)

      setStatus('attesting')
      await new Promise((r) => setTimeout(r, 450))

      setGoalResult(gr)
      setIsGoalFlow(false)
      setStatus('done')
    } catch (err: unknown) {
      setStatus('error')
      setSteps([])
      setIsGoalFlow(false)
      setGoalBudgetUsdt(null)
      if (isWalletUserRejected(err)) {
        setError('Transaction was cancelled in your wallet.')
        return
      }
      if (axios.isAxiosError(err)) {
        const serverMsg = (err.response?.data as { error?: string })?.error
        setError(serverMsg || err.message)
        return
      }
      if (isSignerOrConnectionError(err)) {
        setError(
          'Wallet connection was lost. Refresh the page, reconnect MetaMask, and try again.'
        )
        return
      }
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return {
    execute,
    executeGoal,
    reset,
    status,
    result,
    goalResult,
    steps,
    goalBudgetUsdt,
    isGoalFlow,
    error,
  }
}

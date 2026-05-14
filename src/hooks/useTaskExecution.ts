// KiteDesk | client flow: fund USDT, call agent API, timeline + result UI
'use client'

import { useState } from 'react'
import axios from 'axios'

const AGENT_REQUEST_MS = 125_000
import { ethers } from 'ethers'
import { KITE_CHAIN, KITE_WRONG_NETWORK_PAY_MESSAGE } from '@/lib/constants'
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
    lower.includes('extension id') ||
    lower.includes('network changed') ||
    lower.includes('network_error')
  )
}

function isWrongNetworkError(err: unknown): boolean {
  if (err instanceof Error && err.message === KITE_WRONG_NETWORK_PAY_MESSAGE)
    return true
  const s = err instanceof Error ? err.message : String(err)
  return s.toLowerCase().includes('wrong network')
}

function normalizeAddress(address: string): string {
  try {
    return ethers.getAddress(address)
  } catch {
    return address
  }
}

function isSessionPrepayFallbackError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  if (err.response?.status !== 409) return false
  const code = (err.response?.data as { code?: string } | undefined)?.code
  return code === 'SESSION_KEY_PREPAY_REQUIRED' || code === 'SESSION_KEY_PREPAY_FALLBACK_REQUIRED'
}

async function refreshSessionKeyIdFromBackend(address: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const res = await fetch(`/api/session-keys/list?wallet=${encodeURIComponent(address)}`)
    if (!res.ok) return null
    const data = (await res.json()) as {
      keys?: Array<{ keyId?: string; key_id?: string }>
      sessionKeys?: Array<{ keyId?: string; key_id?: string }>
    }
    const first = (Array.isArray(data.keys) ? data.keys[0] : null) ||
      (Array.isArray(data.sessionKeys) ? data.sessionKeys[0] : null)
    const keyId =
      typeof first?.keyId === 'string'
        ? first.keyId
        : typeof first?.key_id === 'string'
          ? first.key_id
          : null
    if (keyId) {
      localStorage.setItem(`session-key-${address}`, keyId)
      return keyId
    }
    return null
  } catch {
    return null
  }
}

async function requireSignerOnKiteChain(signer: ethers.JsonRpcSigner): Promise<void> {
  const p = signer.provider
  if (!p) {
    throw new Error('Wallet provider unavailable')
  }
  const net = await p.getNetwork()
  if (Number(net.chainId) !== KITE_CHAIN.id) {
    throw new Error(KITE_WRONG_NETWORK_PAY_MESSAGE)
  }
}

export function useTaskExecution() {
  const [status, setStatus] = useState<ExecutionStatus>('idle')
  const [result, setResult] = useState<TaskResult | null>(null)
  const [goalResult, setGoalResult] = useState<GoalResult | null>(null)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [goalBudgetUsdt, setGoalBudgetUsdt] = useState<number | null>(null)
  const [isGoalFlow, setIsGoalFlow] = useState(false)
  const [activeGoalText, setActiveGoalText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStatus('idle')
    setError(null)
    setResult(null)
    setGoalResult(null)
    setSteps([])
    setGoalBudgetUsdt(null)
    setIsGoalFlow(false)
    setActiveGoalText(null)
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

      try {
        await requireSignerOnKiteChain(signer)
      } catch (netErr: unknown) {
        setStatus('error')
        setError(
          netErr instanceof Error ? netErr.message : KITE_WRONG_NETWORK_PAY_MESSAGE
        )
        return
      }

      setStatus('paying')

      setStatus('executing')
      const normalizedAddress = normalizeAddress(address)
      let storedSessionKeyId =
        typeof window !== 'undefined'
          ? localStorage.getItem(`session-key-${normalizedAddress}`)
          : null
      let data: {
        success?: boolean
        taskId?: string
        output?: string
        attestationHash?: string
        attestationUrl?: string
        error?: string
      }
      const postClassicRun = async (sessionKeyId: string | null | undefined) =>
        axios.post<typeof data>(
          '/api/agent',
          {
            taskType,
            prompt,
            userAddress: normalizedAddress,
            userSmartWallet: normalizedAddress,
            sessionKeyId: sessionKeyId || undefined,
          },
          { timeout: AGENT_REQUEST_MS }
        )

      try {
        const res = await postClassicRun(storedSessionKeyId)
        data = res.data
      } catch (agentErr: unknown) {
        if (axios.isAxiosError(agentErr) && isWalletUserRejected(agentErr)) {
          setStatus('error')
          setError('Request was cancelled.')
          return
        }
        if (isSessionPrepayFallbackError(agentErr)) {
          const refreshedKey = await refreshSessionKeyIdFromBackend(normalizedAddress)
          if (refreshedKey && refreshedKey !== storedSessionKeyId) {
            storedSessionKeyId = refreshedKey
            const retry = await postClassicRun(storedSessionKeyId)
            data = retry.data
          } else {
            throw agentErr
          }
        } else {
          throw agentErr
        }
      }

      if (!data || data.error || !data.taskId || !data.output) {
        throw new Error(data?.error || 'Agent request failed')
      }

      setStatus('attesting')
      await new Promise((r) => setTimeout(r, 450))

      const taskResult: TaskResult = {
        taskId: data.taskId,
        output: data.output,
        txHash: '',
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
        if (err.code === 'ECONNABORTED') {
          setError(
            'Request timed out — the agent may still be running. Wait a minute, check your network, then try again with a smaller goal or budget.'
          )
          return
        }
        const serverMsg = (err.response?.data as { error?: string })?.error
        setError(serverMsg || err.message)
        return
      }
      if (isWrongNetworkError(err)) {
        setError(KITE_WRONG_NETWORK_PAY_MESSAGE)
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
        setActiveGoalText(null)
        return
      }

      try {
        await requireSignerOnKiteChain(signer)
      } catch (netErr: unknown) {
        setStatus('error')
        setError(
          netErr instanceof Error ? netErr.message : KITE_WRONG_NETWORK_PAY_MESSAGE
        )
        setIsGoalFlow(false)
        setGoalBudgetUsdt(null)
        setActiveGoalText(null)
        return
      }

      setActiveGoalText(goal.trim())
      setStatus('paying')
      const normalizedAddress = normalizeAddress(address)
      let storedSessionKeyId =
        typeof window !== 'undefined'
          ? localStorage.getItem(`session-key-${normalizedAddress}`)
          : null

      setSteps([])
      setStatus('planning')
      await new Promise((r) => setTimeout(r, 280))

      setStatus('executing')
      const postGoalRun = async () => {
        return axios.post<{
          success?: boolean
          taskId?: string
          goalResult?: GoalResult
          error?: string
          code?: string
          requiresClientPayment?: boolean
        }>(
          '/api/agent',
          {
            taskType: 'goal',
            goal: goal.trim(),
            budgetUsdt,
            userAddress: normalizedAddress,
            userSmartWallet: normalizedAddress,
            sessionKeyId: storedSessionKeyId || undefined,
          },
          { timeout: AGENT_REQUEST_MS }
        )
      }

      let data: {
        success?: boolean
        taskId?: string
        goalResult?: GoalResult
        error?: string
        code?: string
        requiresClientPayment?: boolean
      }
      try {
        const res = await postGoalRun()
        data = res.data
      } catch (agentErr: unknown) {
        if (axios.isAxiosError(agentErr) && isWalletUserRejected(agentErr)) {
          setStatus('error')
          setError('Request was cancelled.')
          setIsGoalFlow(false)
          setGoalBudgetUsdt(null)
          setActiveGoalText(null)
          setSteps([])
          return
        }
        if (isSessionPrepayFallbackError(agentErr)) {
          const refreshedKey = await refreshSessionKeyIdFromBackend(normalizedAddress)
          if (refreshedKey && refreshedKey !== storedSessionKeyId) {
            storedSessionKeyId = refreshedKey
            const res = await axios.post<{
              success?: boolean
              taskId?: string
              goalResult?: GoalResult
              error?: string
              code?: string
              requiresClientPayment?: boolean
            }>(
              '/api/agent',
              {
                taskType: 'goal',
                goal: goal.trim(),
                budgetUsdt,
                userAddress: normalizedAddress,
                userSmartWallet: normalizedAddress,
                sessionKeyId: storedSessionKeyId || undefined,
              },
              { timeout: AGENT_REQUEST_MS }
            )
            data = res.data
          } else {
            throw agentErr
          }
        } else {
          throw agentErr
        }
      }

      if (!data || data.error || !data.goalResult?.taskId) {
        throw new Error(data?.error || 'Goal agent request failed')
      }

      const gr = data.goalResult
      const stepsNorm = Array.isArray(gr.steps) ? gr.steps : []
      setSteps(stepsNorm)

      setStatus('attesting')
      await new Promise((r) => setTimeout(r, 450))

      const finalOutput =
        typeof gr.finalOutput === 'string'
          ? gr.finalOutput
          : String(gr.finalOutput ?? '')
      setGoalResult({ ...gr, steps: stepsNorm, finalOutput })
      setActiveGoalText(null)
      setIsGoalFlow(false)
      setStatus('done')
    } catch (err: unknown) {
      setStatus('error')
      setSteps([])
      setIsGoalFlow(false)
      setGoalBudgetUsdt(null)
      setActiveGoalText(null)
      if (isWalletUserRejected(err)) {
        setError('Transaction was cancelled in your wallet.')
        return
      }
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError(
            'Request timed out — the agent may still be running. Wait a minute, check your network, then try again with a smaller goal or budget.'
          )
          return
        }
        const serverMsg = (err.response?.data as { error?: string })?.error
        setError(serverMsg || err.message)
        return
      }
      if (isWrongNetworkError(err)) {
        setError(KITE_WRONG_NETWORK_PAY_MESSAGE)
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
    activeGoalText,
    error,
  }
}

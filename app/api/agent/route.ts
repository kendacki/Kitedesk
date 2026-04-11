// KiteDesk | POST: run agent task or goal-based multi-step execution
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { v4 as uuidv4 } from 'uuid'
import { executeAgentTask } from '@/lib/agent'
import { writeAttestation, writeGoalAttestation } from '@/lib/attest'
import { HttpError } from '@/lib/httpError'
import { KITE_CHAIN, TASK_CONFIG } from '@/lib/constants'
import { verifyPaymentTransaction } from '@/lib/verifyPayment'
import {
  claimPaymentTransaction,
  completePaymentTask,
  releasePaymentClaim,
} from '@/lib/supabaseTasks'
import { executeGoal } from '@/lib/agentOrchestrator'
import type { GoalResult, TaskType } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

type ClassicTaskType = Exclude<TaskType, 'goal'>

const CLASSIC_TASK_TYPES: ClassicTaskType[] = ['research', 'code_review', 'content_gen']

function explorerTxUrl(txHash: string): string {
  const explorerBase =
    process.env.KITE_EXPLORER_URL ||
    process.env.NEXT_PUBLIC_KITE_EXPLORER_URL ||
    KITE_CHAIN.explorerUrl
  return `${explorerBase.replace(/\/$/, '')}/tx/${txHash}`
}

export async function POST(req: NextRequest) {
  let paymentTxHashForRelease: string | null = null
  let attestationWritten = false
  try {
    const body = (await req.json()) as Record<string, unknown>

    if (body.taskType === 'goal') {
      const goal = typeof body.goal === 'string' ? body.goal : ''
      const budgetRaw = body.budgetUsdt
      const budgetUsdt =
        typeof budgetRaw === 'number'
          ? budgetRaw
          : typeof budgetRaw === 'string'
            ? parseFloat(budgetRaw)
            : NaN
      const userAddress = typeof body.userAddress === 'string' ? body.userAddress : ''
      const paymentTxHash =
        typeof body.paymentTxHash === 'string' ? body.paymentTxHash : ''

      if (!goal.trim() || !userAddress || !paymentTxHash) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }
      if (!Number.isFinite(budgetUsdt) || budgetUsdt < 0.1 || budgetUsdt > 2.0) {
        return NextResponse.json(
          { error: 'budgetUsdt must be between 0.10 and 2.00' },
          { status: 400 }
        )
      }
      if (!ethers.isAddress(userAddress)) {
        return NextResponse.json({ error: 'Invalid user address' }, { status: 400 })
      }

      await verifyPaymentTransaction(paymentTxHash, userAddress, budgetUsdt)

      paymentTxHashForRelease = paymentTxHash
      await claimPaymentTransaction(paymentTxHash, userAddress)

      const partial = await executeGoal(goal.trim(), budgetUsdt)
      const taskId = uuidv4()
      const goalPreview = goal.trim().slice(0, 80)

      const { attestationHash } = await writeGoalAttestation(
        taskId,
        userAddress,
        partial.finalOutput,
        partial.steps,
        partial.totalSpentUsdt,
        goalPreview
      )
      attestationWritten = true

      const attestationUrl = explorerTxUrl(attestationHash)

      await completePaymentTask(paymentTxHash, {
        taskId,
        taskType: 'goal',
        promptPreview: goal.trim().slice(0, 120),
        attestationUrl,
      })

      paymentTxHashForRelease = null

      const goalResult: GoalResult = {
        taskId,
        goal: partial.goal,
        budgetUsdt: partial.budgetUsdt,
        steps: partial.steps,
        totalSpentUsdt: partial.totalSpentUsdt,
        remainingBudget: partial.remainingBudget,
        finalOutput: partial.finalOutput,
        txHash: paymentTxHash,
        attestationHash,
        attestationUrl,
        completedAt: partial.completedAt,
        planReasoning: partial.planReasoning,
        skippedTools: partial.skippedTools,
        x402PaymentsCount: partial.x402PaymentsCount,
        x402TotalPaidUsdt: partial.x402TotalPaidUsdt,
      }

      return NextResponse.json({
        success: true,
        taskId,
        goalResult,
      })
    }

    const { taskType, prompt, userAddress, paymentTxHash } = body as {
      taskType?: string
      prompt?: string
      userAddress?: string
      paymentTxHash?: string
    }

    if (
      !taskType ||
      prompt === undefined ||
      prompt === null ||
      !userAddress ||
      !paymentTxHash
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt cannot be empty' }, { status: 400 })
    }

    if (!CLASSIC_TASK_TYPES.includes(taskType as ClassicTaskType)) {
      return NextResponse.json({ error: 'Invalid task type' }, { status: 400 })
    }

    if (!ethers.isAddress(userAddress)) {
      return NextResponse.json({ error: 'Invalid user address' }, { status: 400 })
    }

    const classicType = taskType as ClassicTaskType
    const expectedAmount = TASK_CONFIG[classicType].priceUsdt
    await verifyPaymentTransaction(paymentTxHash, userAddress, expectedAmount)

    paymentTxHashForRelease = paymentTxHash
    await claimPaymentTransaction(paymentTxHash, userAddress)

    const output = await executeAgentTask(classicType, prompt)
    const taskId = uuidv4()
    const attestationHash = await writeAttestation(
      taskId,
      userAddress,
      output,
      taskType
    )
    attestationWritten = true

    const attestationUrl = explorerTxUrl(attestationHash)

    await completePaymentTask(paymentTxHash, {
      taskId,
      taskType,
      promptPreview: prompt.trim().slice(0, 120),
      attestationUrl,
    })

    paymentTxHashForRelease = null

    return NextResponse.json({
      success: true,
      taskId,
      output,
      attestationHash,
      attestationUrl,
    })
  } catch (err: unknown) {
    if (paymentTxHashForRelease && !attestationWritten) {
      await releasePaymentClaim(paymentTxHashForRelease)
    }
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

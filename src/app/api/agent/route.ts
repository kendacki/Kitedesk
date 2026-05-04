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
import { payForTaskWithSigner } from '@/lib/payment'
import {
  getDecryptedSessionKeyWalletById,
  getSessionKeyByIdForUser,
} from '@/lib/sessionKeys'
import { getPlatformWalletAddress } from '@/lib/verifyPayment'
import type { GoalResult, TaskType } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

type ClassicTaskType = Exclude<TaskType, 'goal'>

const CLASSIC_TASK_TYPES: ClassicTaskType[] = ['research', 'code_review', 'content_gen']

async function trySessionKeyPrepay(params: {
  userAddress: string
  userSmartWallet: string
  sessionKeyId: string
  amountUsdt: number
}): Promise<{ txHash: string; payerAddress: string } | null> {
  if (
    !ethers.isAddress(params.userAddress) ||
    !ethers.isAddress(params.userSmartWallet)
  ) {
    return null
  }

  if (
    ethers.getAddress(params.userAddress) !== ethers.getAddress(params.userSmartWallet)
  ) {
    return null
  }

  const keyRecord = await getSessionKeyByIdForUser(
    params.userSmartWallet,
    params.sessionKeyId
  )
  if (!keyRecord) {
    return null
  }

  if (params.amountUsdt > keyRecord.max_per_tx_usdt) {
    return null
  }

  const platform = getPlatformWalletAddress()
  const allowedRecipients = (keyRecord.whitelisted_recipients || []).map((r) =>
    ethers.getAddress(r)
  )
  if (!allowedRecipients.includes(ethers.getAddress(platform))) {
    return null
  }

  const provider = new ethers.JsonRpcProvider(KITE_CHAIN.rpcUrl)
  const sessionWallet = await getDecryptedSessionKeyWalletById(
    params.userSmartWallet,
    params.sessionKeyId,
    provider
  )
  if (!sessionWallet) {
    return null
  }

  const txHash = await payForTaskWithSigner(sessionWallet, params.amountUsdt)
  return { txHash, payerAddress: sessionWallet.address }
}

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
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

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
      const userSmartWallet =
        typeof body.userSmartWallet === 'string' ? body.userSmartWallet : ''
      const sessionKeyId =
        typeof body.sessionKeyId === 'string' ? body.sessionKeyId : ''

      if (!goal.trim() || !userAddress) {
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

      let effectivePaymentTxHash = paymentTxHash
      let paymentPayerAddress = userAddress

      if (!effectivePaymentTxHash && userSmartWallet && sessionKeyId) {
        try {
          const sessionPrepay = await trySessionKeyPrepay({
            userAddress,
            userSmartWallet,
            sessionKeyId,
            amountUsdt: budgetUsdt,
          })
          if (sessionPrepay) {
            effectivePaymentTxHash = sessionPrepay.txHash
            paymentPayerAddress = sessionPrepay.payerAddress
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn('[API] session-key prepay failed; client payment required', msg)
        }
      }

      if (!effectivePaymentTxHash) {
        if (userSmartWallet && sessionKeyId) {
          return NextResponse.json(
            {
              error:
                'Session key wallet could not prepay this goal. Fallback to wallet payment is required for this run.',
              code: 'SESSION_KEY_PREPAY_FALLBACK_REQUIRED',
              requiresClientPayment: true,
            },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { error: 'Missing payment transaction hash' },
          { status: 400 }
        )
      }

      await verifyPaymentTransaction(
        effectivePaymentTxHash,
        paymentPayerAddress,
        budgetUsdt
      )

      paymentTxHashForRelease = effectivePaymentTxHash
      await claimPaymentTransaction(effectivePaymentTxHash, userAddress)

      try {
        const partial = await executeGoal(goal.trim(), budgetUsdt, {
          userSmartWallet:
            userSmartWallet && ethers.isAddress(userSmartWallet)
              ? userSmartWallet
              : undefined,
          sessionKeyId: sessionKeyId || undefined,
        })
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

        await completePaymentTask(effectivePaymentTxHash, {
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
          txHash: effectivePaymentTxHash,
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
      } catch (rollbackErr: unknown) {
        if (!attestationWritten) {
          await releasePaymentClaim(effectivePaymentTxHash)
        }
        throw rollbackErr
      }
    }

    const {
      taskType,
      prompt,
      userAddress,
      userSmartWallet,
      paymentTxHash,
      sessionKeyId,
    } = body as {
      taskType?: string
      prompt?: string
      userAddress?: string
      userSmartWallet?: string
      paymentTxHash?: string
      sessionKeyId?: string
    }

    if (!taskType || prompt === undefined || prompt === null || !userAddress) {
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

    let effectivePaymentTxHash = paymentTxHash || ''
    let paymentPayerAddress = userAddress
    if (!effectivePaymentTxHash && userSmartWallet && sessionKeyId) {
      try {
        const sessionPrepay = await trySessionKeyPrepay({
          userAddress,
          userSmartWallet,
          sessionKeyId,
          amountUsdt: expectedAmount,
        })
        if (sessionPrepay) {
          effectivePaymentTxHash = sessionPrepay.txHash
          paymentPayerAddress = sessionPrepay.payerAddress
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn('[API] session-key prepay failed for classic task:', msg)
      }
    }

    if (!effectivePaymentTxHash) {
      return NextResponse.json(
        {
          error:
            'Session key wallet could not prepay this task. The client wallet approval flow has been removed.',
          code: 'SESSION_KEY_PREPAY_REQUIRED',
          requiresClientPayment: false,
        },
        { status: 409 }
      )
    }

    await verifyPaymentTransaction(
      effectivePaymentTxHash,
      paymentPayerAddress,
      expectedAmount
    )

    paymentTxHashForRelease = effectivePaymentTxHash
    await claimPaymentTransaction(effectivePaymentTxHash, userAddress)

    try {
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

      await completePaymentTask(effectivePaymentTxHash, {
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
    } catch (rollbackErr: unknown) {
      if (!attestationWritten) {
        await releasePaymentClaim(effectivePaymentTxHash)
      }
      throw rollbackErr
    }
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

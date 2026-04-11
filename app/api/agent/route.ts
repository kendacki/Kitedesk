// KiteDesk | POST: run agent and write on-chain attestation after payment
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { v4 as uuidv4 } from 'uuid'
import { executeAgentTask } from '@/lib/agent'
import { writeAttestation } from '@/lib/attest'
import { HttpError } from '@/lib/httpError'
import { KITE_CHAIN } from '@/lib/constants'
import { verifyPaymentTransaction } from '@/lib/verifyPayment'
import type { TaskType } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const TASK_TYPES: TaskType[] = ['research', 'code_review', 'content_gen']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
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

    if (!TASK_TYPES.includes(taskType as TaskType)) {
      return NextResponse.json({ error: 'Invalid task type' }, { status: 400 })
    }

    if (!ethers.isAddress(userAddress)) {
      return NextResponse.json({ error: 'Invalid user address' }, { status: 400 })
    }

    await verifyPaymentTransaction(paymentTxHash, userAddress)

    const output = await executeAgentTask(taskType as TaskType, prompt)
    const taskId = uuidv4()
    const attestationHash = await writeAttestation(
      taskId,
      userAddress,
      output,
      taskType
    )

    const explorerBase =
      process.env.KITE_EXPLORER_URL ||
      process.env.NEXT_PUBLIC_KITE_EXPLORER_URL ||
      KITE_CHAIN.explorerUrl
    const attestationUrl = `${explorerBase.replace(/\/$/, '')}/tx/${attestationHash}`

    return NextResponse.json({
      success: true,
      taskId,
      output,
      attestationHash,
      attestationUrl,
    })
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

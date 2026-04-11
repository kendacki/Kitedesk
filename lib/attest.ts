// KiteDesk | write task result attestation on Kite chain (server-side signer)
import { ethers } from 'ethers'
import { HttpError } from '@/lib/httpError'
import { CONTRACTS, KITE_CHAIN } from './constants'
import type { AgentStep } from '@/types'

const ATTESTATION_ABI = [
  'function attestTask(string taskId, address user, bytes32 resultHash, string taskType) external',
  'function attestGoal(string taskId, address user, bytes32 resultHash, bytes32 stepsHash, uint256 totalSpentMicro, uint8 stepCount, string goalPreview, uint256 x402PaymentsCount, uint256 x402TotalPaidMicro) external',
]

function goalX402StatsFromSteps(steps: AgentStep[]): {
  x402PaymentsCount: number
  x402TotalPaidMicro: bigint
} {
  let count = 0
  let totalMicro = BigInt(0)
  for (const s of steps) {
    if (s.toolCall?.paymentStatus !== 'paid_via_x402') continue
    count += 1
    const cost = s.toolCall.costUsdt
    const micro =
      typeof cost === 'number' && Number.isFinite(cost)
        ? BigInt(Math.round(cost * 1_000_000))
        : BigInt(0)
    totalMicro += micro
  }
  return { x402PaymentsCount: count, x402TotalPaidMicro: totalMicro }
}

export async function writeAttestation(
  taskId: string,
  userAddress: string,
  result: string,
  taskType: string
): Promise<string> {
  const pk = process.env.ATTESTATION_SIGNER_PRIVATE_KEY
  if (!pk) {
    throw new HttpError('ATTESTATION_SIGNER_PRIVATE_KEY is not configured', 503)
  }
  if (!CONTRACTS.attestation || !ethers.isAddress(CONTRACTS.attestation)) {
    throw new HttpError('Attestation contract address is not configured', 503)
  }

  const provider = new ethers.JsonRpcProvider(KITE_CHAIN.rpcUrl)
  const signer = new ethers.Wallet(pk, provider)
  const contract = new ethers.Contract(CONTRACTS.attestation, ATTESTATION_ABI, signer)

  const resultHash = ethers.keccak256(ethers.toUtf8Bytes(result))
  const tx = await contract.attestTask(taskId, userAddress, resultHash, taskType)
  const receipt = await tx.wait()
  if (!receipt || receipt.status !== 1) {
    throw new HttpError('Attestation transaction failed', 502)
  }
  return receipt.hash
}

export async function writeGoalAttestation(
  taskId: string,
  userAddress: string,
  finalOutput: string,
  steps: AgentStep[],
  totalSpentUsdt: number,
  goalPreview: string
): Promise<{
  attestationHash: string
  x402PaymentsCount: number
  x402TotalPaidMicro: number
}> {
  const pk = process.env.ATTESTATION_SIGNER_PRIVATE_KEY
  if (!pk) {
    throw new HttpError('ATTESTATION_SIGNER_PRIVATE_KEY is not configured', 503)
  }
  if (!CONTRACTS.attestation || !ethers.isAddress(CONTRACTS.attestation)) {
    throw new HttpError('Attestation contract address is not configured', 503)
  }

  if (steps.length > 255) {
    throw new HttpError('Too many steps for on-chain attestation', 400)
  }

  const provider = new ethers.JsonRpcProvider(KITE_CHAIN.rpcUrl)
  const signer = new ethers.Wallet(pk, provider)
  const contract = new ethers.Contract(CONTRACTS.attestation, ATTESTATION_ABI, signer)

  const resultHash = ethers.keccak256(ethers.toUtf8Bytes(finalOutput))
  const stepsHash = ethers.keccak256(
    ethers.toUtf8Bytes(
      JSON.stringify(
        steps.map((s) => ({
          tool: s.toolCall?.toolName,
          cost: s.toolCall?.costUsdt,
          reasoning: s.reasoning,
        }))
      )
    )
  )
  const totalSpentMicro = BigInt(Math.round(totalSpentUsdt * 1_000_000))
  const stepCount = steps.length
  const { x402PaymentsCount, x402TotalPaidMicro } = goalX402StatsFromSteps(steps)

  const tx = await contract.attestGoal(
    taskId,
    userAddress,
    resultHash,
    stepsHash,
    totalSpentMicro,
    stepCount,
    goalPreview,
    x402PaymentsCount,
    x402TotalPaidMicro
  )
  const receipt = await tx.wait()
  if (!receipt || receipt.status !== 1) {
    throw new HttpError('Goal attestation transaction failed', 502)
  }
  const x402MicroNum = Number(x402TotalPaidMicro)
  if (!Number.isSafeInteger(x402MicroNum)) {
    throw new HttpError('x402 total micro-USDT exceeds safe integer range', 500)
  }
  return {
    attestationHash: receipt.hash,
    x402PaymentsCount,
    x402TotalPaidMicro: x402MicroNum,
  }
}

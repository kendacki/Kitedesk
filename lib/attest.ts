// KiteDesk | write task result attestation on Kite chain (server-side signer)
import { ethers } from 'ethers'
import { HttpError } from '@/lib/httpError'
import { CONTRACTS, KITE_CHAIN } from './constants'

const ATTESTATION_ABI = [
  'function attestTask(string taskId, address user, bytes32 resultHash, string taskType) external',
]

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

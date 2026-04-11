// KiteDesk | server-side checks that the payment tx matches wallet, chain, and USDT contract
import { ethers } from 'ethers'
import { HttpError } from '@/lib/httpError'
import { CONTRACTS, KITE_CHAIN } from './constants'

export async function verifyPaymentTransaction(
  txHash: string,
  userAddress: string
): Promise<void> {
  const rpc =
    process.env.KITE_RPC_URL ||
    process.env.NEXT_PUBLIC_KITE_RPC_URL ||
    KITE_CHAIN.rpcUrl

  const provider = new ethers.JsonRpcProvider(rpc)
  const network = await provider.getNetwork()

  if (Number(network.chainId) !== KITE_CHAIN.id) {
    throw new HttpError('Payment RPC chain does not match Kite testnet', 400)
  }

  const tx = await provider.getTransaction(txHash)
  if (!tx) {
    throw new HttpError('Payment transaction not found', 400)
  }

  if (tx.from.toLowerCase() !== userAddress.toLowerCase()) {
    throw new HttpError('Payment sender does not match connected wallet', 400)
  }

  const usdt = CONTRACTS.usdt
  if (usdt && ethers.isAddress(usdt) && tx.to?.toLowerCase() !== usdt.toLowerCase()) {
    throw new HttpError('Payment must call the configured USDT contract', 400)
  }

  const receipt = await provider.getTransactionReceipt(txHash)
  if (!receipt || receipt.status !== 1) {
    throw new HttpError('Payment transaction failed or not confirmed', 400)
  }
}

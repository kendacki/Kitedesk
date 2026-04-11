// KiteDesk | server-side checks: chain, sender, USDT contract, Transfer log amount + recipient
import { ethers } from 'ethers'
import { HttpError } from '@/lib/httpError'
import { CONTRACTS, KITE_CHAIN } from './constants'

const ERC20_ABI = ['function decimals() view returns (uint8)']

const TRANSFER_IFACE = new ethers.Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
])

function getPlatformWalletAddress(): string {
  const w =
    process.env.NEXT_PUBLIC_PLATFORM_WALLET?.trim() ||
    process.env.PLATFORM_WALLET?.trim()
  if (!w || !ethers.isAddress(w)) {
    throw new HttpError('Server misconfiguration: platform wallet', 500)
  }
  return ethers.getAddress(w)
}

function amountToUnits(humanAmount: number, decimals: number): bigint {
  const s = humanAmount.toFixed(12).replace(/\.?0+$/, '')
  return ethers.parseUnits(s.length > 0 ? s : '0', decimals)
}

export async function verifyPaymentTransaction(
  txHash: string,
  userAddress: string,
  expectedAmountHuman: number
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

  const normalizedHash = txHash.trim()
  if (!/^0x([A-Fa-f0-9]{64})$/.test(normalizedHash)) {
    throw new HttpError('Invalid payment transaction hash', 400)
  }

  const tx = await provider.getTransaction(normalizedHash)
  if (!tx) {
    throw new HttpError('Payment transaction not found', 400)
  }

  const user = ethers.getAddress(userAddress)

  if (ethers.getAddress(tx.from) !== user) {
    throw new HttpError('Payment sender does not match connected wallet', 400)
  }

  const usdt = CONTRACTS.usdt
  if (!usdt || !ethers.isAddress(usdt)) {
    throw new HttpError('USDT contract is not configured', 500)
  }
  const tokenAddress = ethers.getAddress(usdt)

  if (!tx.to || ethers.getAddress(tx.to) !== tokenAddress) {
    throw new HttpError('Payment must call the configured USDT contract', 400)
  }

  const receipt = await provider.getTransactionReceipt(normalizedHash)
  if (!receipt || receipt.status !== 1) {
    throw new HttpError('Payment transaction failed or not confirmed', 400)
  }

  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const decimals = Number(await token.decimals())
  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 36) {
    throw new HttpError('Invalid token decimals from contract', 500)
  }

  const expectedUnits = amountToUnits(expectedAmountHuman, decimals)
  const platform = getPlatformWalletAddress()

  let paidToPlatform = BigInt(0)
  for (const log of receipt.logs) {
    if (!log.address || ethers.getAddress(log.address) !== tokenAddress) {
      continue
    }
    let parsed: ethers.LogDescription | null = null
    try {
      parsed = TRANSFER_IFACE.parseLog({
        topics: log.topics as string[],
        data: log.data,
      })
    } catch {
      continue
    }
    if (!parsed || parsed.name !== 'Transfer') continue
    const from = ethers.getAddress(String(parsed.args.from))
    const to = ethers.getAddress(String(parsed.args.to))
    const value = BigInt(String(parsed.args.value))
    if (from === user && to === platform) {
      paidToPlatform += value
    }
  }

  if (paidToPlatform < expectedUnits) {
    throw new HttpError('USDT amount or recipient does not satisfy the task price', 400)
  }
}

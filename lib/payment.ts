// KiteDesk | USDT on-chain transfer to platform + balance helper

import { ethers } from 'ethers'
import { CONTRACTS, KITE_X402 } from './constants'

/** Kite PYUSD / test USDT uses 6 decimals; we still read `decimals()` on-chain to avoid display/pay drift. */
const DEFAULT_STABLECOIN_DECIMALS = KITE_X402.stablecoinDecimals

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

function normalizeDecimals(raw: unknown): number {
  const n = typeof raw === 'bigint' ? Number(raw) : Number(raw)
  if (!Number.isFinite(n) || n < 1 || n > 36) return DEFAULT_STABLECOIN_DECIMALS
  return n
}

async function readErc20Decimals(token: ethers.Contract): Promise<number> {
  try {
    return normalizeDecimals(await token.decimals())
  } catch {
    return DEFAULT_STABLECOIN_DECIMALS
  }
}

function getPlatformWallet(): string {
  const w =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_PLATFORM_WALLET?.trim() || process.env.PLATFORM_WALLET?.trim()
      : undefined
  if (!w || !ethers.isAddress(w)) {
    throw new Error(
      'NEXT_PUBLIC_PLATFORM_WALLET is not set or invalid. Add it to .env.local, then restart next dev.'
    )
  }
  return ethers.getAddress(w)
}

export async function checkUsdtBalance(
  provider: ethers.BrowserProvider,
  address: string
): Promise<number | null> {
  if (!CONTRACTS.usdt || !ethers.isAddress(CONTRACTS.usdt)) {
    return null
  }
  const token = new ethers.Contract(CONTRACTS.usdt, ERC20_ABI, provider)
  const [balance, unitDecimals] = await Promise.all([
    token.balanceOf(address),
    readErc20Decimals(token),
  ])
  return parseFloat(ethers.formatUnits(balance, unitDecimals))
}

export async function payForTask(
  signer: ethers.JsonRpcSigner,
  priceUsdt: number
): Promise<string> {
  if (!Number.isFinite(priceUsdt) || priceUsdt <= 0) {
    throw new Error('Invalid payment amount')
  }
  if (!CONTRACTS.usdt || !ethers.isAddress(CONTRACTS.usdt)) {
    throw new Error('USDT contract is not configured')
  }

  const tokenAddress = ethers.getAddress(CONTRACTS.usdt)
  const platform = getPlatformWallet()

  const tokenWithSigner = new ethers.Contract(tokenAddress, ERC20_ABI, signer)

  const unitDecimals = await readErc20Decimals(tokenWithSigner)
  const amount = ethers.parseUnits(
    priceUsdt.toFixed(Math.min(unitDecimals, 20)),
    unitDecimals
  )

  const from = await signer.getAddress()
  const balance = await tokenWithSigner.balanceOf(from)
  if (balance < amount) {
    const have = ethers.formatUnits(balance, unitDecimals)
    const need = ethers.formatUnits(amount, unitDecimals)
    throw new Error(
      `Insufficient USDT on Kite testnet: need ${need} USDT for this task but your balance is ${have}. Add testnet USDT to ${from.slice(0, 6)}…${from.slice(-4)} (e.g. Kite faucet / docs). You also need a small amount of KITE in the same wallet for gas.`
    )
  }

  const tx = await tokenWithSigner.transfer(platform, amount)
  const receipt = await tx.wait()

  if (!receipt || receipt.status !== 1) {
    throw new Error('Payment transaction failed')
  }

  return receipt.hash
}

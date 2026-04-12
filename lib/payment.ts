// KiteDesk | USDT on-chain transfer to platform + balance helper

import { ethers } from 'ethers'
import { CONTRACTS, KITE_X402 } from './constants'

const decimals = KITE_X402.stablecoinDecimals

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

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
  const balance = await token.balanceOf(address)
  return parseFloat(ethers.formatUnits(balance, decimals))
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

  const amount = ethers.parseUnits(priceUsdt.toFixed(Math.min(decimals, 20)), decimals)

  const from = await signer.getAddress()
  const balance = await tokenWithSigner.balanceOf(from)
  if (balance < amount) {
    const have = ethers.formatUnits(balance, decimals)
    const need = ethers.formatUnits(amount, decimals)
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

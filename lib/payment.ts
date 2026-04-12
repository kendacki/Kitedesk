// KiteDesk | USDT on-chain transfer to platform + balance helper

import { ethers } from 'ethers'
import { CONTRACTS } from './constants'

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

function getPlatformWallet(): string {
  const w =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PLATFORM_WALLET : undefined
  if (!w || !ethers.isAddress(w)) {
    throw new Error('NEXT_PUBLIC_PLATFORM_WALLET is not set or invalid')
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
  const [balance, decimals] = await Promise.all([
    token.balanceOf(address),
    token.decimals(),
  ])
  return parseFloat(ethers.formatUnits(balance, decimals))
}

export async function payForTask(
  signer: ethers.JsonRpcSigner,
  priceUsdt: number
): Promise<string> {
  if (!CONTRACTS.usdt || !ethers.isAddress(CONTRACTS.usdt)) {
    throw new Error('USDT contract is not configured')
  }

  const tokenAddress = ethers.getAddress(CONTRACTS.usdt)
  const platform = getPlatformWallet()

  const provider = signer.provider as ethers.BrowserProvider
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const tokenWithSigner = new ethers.Contract(tokenAddress, ERC20_ABI, signer)

  const decimals = Number(await token.decimals())
  const amount = ethers.parseUnits(
    priceUsdt.toFixed(Math.min(decimals, 20)),
    decimals
  )

  const tx = await tokenWithSigner.transfer(platform, amount)
  const receipt = await tx.wait()

  if (!receipt || receipt.status !== 1) {
    throw new Error('Payment transaction failed')
  }

  return receipt.hash
}

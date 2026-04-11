// KiteDesk | USDT transfer and balance helpers on Kite testnet

import { ethers } from 'ethers'
import { CONTRACTS } from './constants'

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
]

function getPlatformWalletAddress(): string {
  const w =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PLATFORM_WALLET : undefined
  if (!w || !ethers.isAddress(w)) {
    throw new Error('NEXT_PUBLIC_PLATFORM_WALLET is not set or invalid')
  }
  return w
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
  const platform = getPlatformWalletAddress()
  const token = new ethers.Contract(CONTRACTS.usdt, ERC20_ABI, signer)
  const decimals = await token.decimals()
  const amount = ethers.parseUnits(priceUsdt.toString(), decimals)

  const tx = await token.transfer(platform, amount)
  const receipt = await tx.wait()

  if (!receipt || receipt.status !== 1) {
    throw new Error('Payment transaction failed')
  }

  return receipt.hash
}

// KiteDesk | USDT gasless transfer via Kite public relayer (EIP-3009) + balance helper

import { ethers } from 'ethers'
import { CONTRACTS, KITE_CHAIN, KITE_RELAYER } from './constants'

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

const TRANSFER_WITH_AUTHORIZATION_TYPE = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
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
  const from = await signer.getAddress()

  const provider = signer.provider as ethers.BrowserProvider
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const decimals = Number(await token.decimals())
  const value = ethers.parseUnits(priceUsdt.toFixed(Math.min(decimals, 20)), decimals)

  const now = Math.floor(Date.now() / 1000)
  const validAfter = now - 60
  const validBefore = now + 3600
  const nonce = ethers.hexlify(ethers.randomBytes(32))

  const domain = {
    name: KITE_RELAYER.tokenDomainName,
    version: KITE_RELAYER.tokenDomainVersion,
    chainId: KITE_CHAIN.id,
    verifyingContract: tokenAddress,
  }

  const message = {
    from,
    to: platform,
    value,
    validAfter,
    validBefore,
    nonce,
  }

  const signature = await signer.signTypedData(
    domain,
    {
      TransferWithAuthorization: TRANSFER_WITH_AUTHORIZATION_TYPE,
    },
    message
  )

  const { v, r, s } = ethers.Signature.from(signature)

  const payload = {
    from,
    to: platform,
    value: value.toString(),
    validAfter: validAfter.toString(),
    validBefore: validBefore.toString(),
    nonce,
    v,
    r,
    s,
  }

  const res = await fetch(KITE_RELAYER.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      detail = body.error ?? body.message ?? detail
    } catch {
      // use statusText
    }
    throw new Error(`Relayer rejected transaction: ${detail}`)
  }

  const raw = (await res.json()) as { txHash?: string; transactionHash?: string }
  const txHash = raw.txHash ?? raw.transactionHash
  if (!txHash) {
    throw new Error('Relayer returned no txHash')
  }

  return txHash
}

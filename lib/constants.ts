// KiteDesk | chain config, task pricing, and contract addresses

import { ethers } from 'ethers'

const envOr = (key: string, fallback: string): string => {
  const v = process.env[key]
  return v && v.length > 0 ? v : fallback
}

/** Kite testnet default USDT (PYUSD / test USD) when no contract env is set — same token as x402 default */
const KITE_TESTNET_DEFAULT_USDT =
  '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63'

function resolveUsdtTokenAddress(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_KITE_USDT_CONTRACT,
    process.env.KITE_USDT_CONTRACT,
    process.env.NEXT_PUBLIC_KITE_X402_TOKEN,
    process.env.KITE_X402_TOKEN,
  ]
  for (const c of candidates) {
    const t = typeof c === 'string' ? c.trim() : ''
    if (t && ethers.isAddress(t)) {
      return ethers.getAddress(t)
    }
  }
  return ethers.getAddress(KITE_TESTNET_DEFAULT_USDT)
}

export const KITE_CHAIN = {
  id: Number(envOr('NEXT_PUBLIC_KITE_CHAIN_ID', envOr('KITE_CHAIN_ID', '2368'))),
  name: 'Kite AI Testnet',
  rpcUrl: envOr(
    'NEXT_PUBLIC_KITE_RPC_URL',
    envOr('KITE_RPC_URL', 'https://rpc-testnet.gokite.ai')
  ),
  explorerUrl: envOr(
    'NEXT_PUBLIC_KITE_EXPLORER_URL',
    envOr('KITE_EXPLORER_URL', 'https://testnet.kitescan.ai')
  ),
  currency: 'KITE',
} as const

/** Wallet left Kite testnet; hooks clear the signer until the user is back on `KITE_CHAIN.id`. */
export const KITE_STAY_ON_TESTNET_MESSAGE = 'Please stay on Kite AI Testnet'

/** Thrown before USDT payment if the wallet chain is not Kite (avoids silent mainnet failures). */
export const KITE_WRONG_NETWORK_PAY_MESSAGE = 'Wrong network. Switch to Kite AI Testnet'

export const KITE_RELAYER = {
  url: envOr(
    'NEXT_PUBLIC_KITE_RELAYER_URL',
    envOr('KITE_RELAYER_URL', 'https://relayer-testnet.gokite.ai/v1/gasless/transfer')
  ),
  tokenDomainName: envOr('NEXT_PUBLIC_KITE_TOKEN_DOMAIN_NAME', 'PYUSD'),
  tokenDomainVersion: envOr('NEXT_PUBLIC_KITE_TOKEN_DOMAIN_VERSION', '1'),
} as const

export const TASK_CONFIG = {
  research: {
    label: 'Web Research',
    description: 'Deep research on any topic. Returns structured summary.',
    priceUsdt: 0.1,
    estimatedTime: '15-30 seconds',
    icon: 'search' as const,
  },
  code_review: {
    label: 'Code Review',
    description: 'Paste code, get detailed security and quality review.',
    priceUsdt: 0.15,
    estimatedTime: '10-20 seconds',
    icon: 'code' as const,
  },
  content_gen: {
    label: 'Content Generation',
    description: 'Generate tweets, LinkedIn posts, or blog outlines.',
    priceUsdt: 0.05,
    estimatedTime: '5-10 seconds',
    icon: 'content' as const,
  },
  goal: {
    label: 'Goal Agent',
    description: 'Multi-step agent; you set a USDT budget at run time.',
    priceUsdt: 0.1,
    estimatedTime: 'Varies',
    icon: 'search' as const,
  },
} as const

export const CONTRACTS = {
  /** Testnet USDT (EIP-3009) for balance + relayer; defaults to Kite canonical address if env unset */
  usdt: resolveUsdtTokenAddress(),
  attestation: envOr(
    'NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT',
    envOr('KITE_ATTESTATION_CONTRACT', '')
  ),
}

const X402_FACILITATOR_DEFAULT = 'https://facilitator.pieverse.io'

function x402FacilitatorSettleUrl(): string {
  const base = envOr('KITE_FACILITATOR_URL', X402_FACILITATOR_DEFAULT).replace(/\/$/, '')
  return base.endsWith('/v2/settle') ? base : `${base}/v2/settle`
}

/** Human USDT max charge for one x402 search (encoded with stablecoinDecimals in 402 payload) */
export const X402_SEARCH_PRICE_USDT = 0.05

/** x402 agent payments: EIP-3009 asset, Pieverse settle URL, optional Kite demo resource URL */
export const KITE_X402 = {
  /** PYUSD / test USDT on Kite testnet — avoid on-chain decimals() in hot paths */
  stablecoinDecimals: 6 as const,
  get tokenAddress(): string {
    const fromEnv =
      process.env.KITE_X402_TOKEN?.trim() ||
      process.env.NEXT_PUBLIC_KITE_X402_TOKEN?.trim()
    if (fromEnv && ethers.isAddress(fromEnv)) {
      return ethers.getAddress(fromEnv)
    }
    return CONTRACTS.usdt
  },
  get settleUrl(): string {
    return x402FacilitatorSettleUrl()
  },
  get demoApiUrl(): string {
    return process.env.KITE_X402_DEMO_API?.trim() ?? ''
  },
} as const

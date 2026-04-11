// KiteDesk | chain config, task pricing, and contract addresses

const envOr = (key: string, fallback: string): string => {
  const v = process.env[key]
  return v && v.length > 0 ? v : fallback
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
  usdt: envOr('NEXT_PUBLIC_KITE_USDT_CONTRACT', envOr('KITE_USDT_CONTRACT', '')),
  attestation: envOr(
    'NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT',
    envOr('KITE_ATTESTATION_CONTRACT', '')
  ),
}

const X402_TOKEN_DEFAULT = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63'
const X402_FACILITATOR_DEFAULT = 'https://facilitator.pieverse.io'

function x402FacilitatorSettleUrl(): string {
  const base = envOr('KITE_FACILITATOR_URL', X402_FACILITATOR_DEFAULT).replace(/\/$/, '')
  return base.endsWith('/v2/settle') ? base : `${base}/v2/settle`
}

/** x402 agent payments: EIP-3009 asset, Pieverse settle URL, optional Kite demo resource URL */
export const KITE_X402 = {
  get tokenAddress(): string {
    const fromEnv = process.env.KITE_X402_TOKEN?.trim()
    if (fromEnv) return fromEnv
    const u = CONTRACTS.usdt.trim()
    return u.length > 0 ? u : X402_TOKEN_DEFAULT
  },
  get settleUrl(): string {
    return x402FacilitatorSettleUrl()
  },
  get demoApiUrl(): string {
    return process.env.KITE_X402_DEMO_API?.trim() ?? ''
  },
} as const

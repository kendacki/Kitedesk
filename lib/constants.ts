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
} as const

export const CONTRACTS = {
  usdt: envOr('NEXT_PUBLIC_KITE_USDT_CONTRACT', envOr('KITE_USDT_CONTRACT', '')),
  attestation: envOr(
    'NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT',
    envOr('KITE_ATTESTATION_CONTRACT', '')
  ),
}

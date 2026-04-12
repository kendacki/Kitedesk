/**
 * KiteDesk | backend readiness: env presence, RPC chain, contract bytecode, optional Groq ping
 * Usage: node scripts/verify-backend.cjs [--live-groq]
 *
 * Loads .env then .env.local (later file does not override earlier by default in dotenv;
 * we load .env first so .env.local wins for overrides).
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
require('dotenv').config({
  path: path.join(__dirname, '..', '.env.local'),
  override: true,
})

const { ethers } = require('ethers')

const DEFAULT_KITE_TESTNET_USDT = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63'

function has(v) {
  return typeof v === 'string' && v.trim().length > 0
}

function ok(msg) {
  console.log('[ok]', msg)
}

function fail(msg) {
  console.error('[fail]', msg)
}

async function maybeLiveGroq() {
  if (!process.argv.includes('--live-groq')) {
    ok('Groq live call skipped (pass --live-groq to test API)')
    return
  }
  const key = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b'
  if (!has(key)) {
    fail('GROQ_API_KEY missing; cannot run live Groq test')
    process.exitCode = 1
    return
  }
  const { Groq } = require('groq-sdk')
  const client = new Groq({ apiKey: key })
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 32,
    messages: [{ role: 'user', content: 'Reply with exactly: pong' }],
  })
  const text = completion.choices[0]?.message?.content
  if (!text || typeof text !== 'string') {
    fail('Groq returned empty content')
    process.exitCode = 1
    return
  }
  ok(`Groq live response (${model}): ${text.slice(0, 80)}…`)
}

async function main() {
  const effectiveUsdt =
    process.env.KITE_USDT_CONTRACT?.trim() ||
    process.env.NEXT_PUBLIC_KITE_USDT_CONTRACT?.trim() ||
    DEFAULT_KITE_TESTNET_USDT

  ok(`Effective USDT token (env or default): ${effectiveUsdt}`)

  const required = [
    ['GROQ_API_KEY', process.env.GROQ_API_KEY],
    [
      'KITE_ATTESTATION_CONTRACT or NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT',
      process.env.KITE_ATTESTATION_CONTRACT ||
        process.env.NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT,
    ],
    ['ATTESTATION_SIGNER_PRIVATE_KEY', process.env.ATTESTATION_SIGNER_PRIVATE_KEY],
    ['NEXT_PUBLIC_PLATFORM_WALLET', process.env.NEXT_PUBLIC_PLATFORM_WALLET],
    ['SUPABASE_URL', process.env.SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
  ]

  let bad = false
  for (const [label, v] of required) {
    if (!has(v)) {
      fail(`Missing ${label}`)
      bad = true
    } else {
      ok(`${label.split(' ')[0]} is set`)
    }
  }
  if (bad) {
    process.exitCode = 1
  }

  const rpc =
    process.env.KITE_RPC_URL ||
    process.env.NEXT_PUBLIC_KITE_RPC_URL ||
    'https://rpc-testnet.gokite.ai'
  const provider = new ethers.JsonRpcProvider(rpc)
  const net = await provider.getNetwork()
  const chainId = Number(net.chainId)
  if (chainId !== 2368) {
    fail(`Expected chain ID 2368, got ${chainId}`)
    process.exitCode = 1
  } else {
    ok(`RPC chain ID 2368 (${rpc})`)
  }

  const byteLen = (hex) => (hex && hex.startsWith('0x') ? (hex.length - 2) / 2 : 0)

  if (effectiveUsdt && ethers.isAddress(effectiveUsdt)) {
    const code = await provider.getCode(effectiveUsdt)
    if (byteLen(code) < 100) {
      fail('USDT contract bytecode looks empty')
      process.exitCode = 1
    } else {
      ok(`USDT contract has bytecode (${byteLen(code)} bytes)`)
    }
  }

  const att =
    process.env.KITE_ATTESTATION_CONTRACT ||
    process.env.NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT
  if (att && ethers.isAddress(att)) {
    const code = await provider.getCode(att)
    if (byteLen(code) < 100) {
      fail('Attestation contract bytecode looks empty')
      process.exitCode = 1
    } else {
      ok(`Attestation contract has bytecode (${byteLen(code)} bytes)`)
    }
  }

  await maybeLiveGroq()
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

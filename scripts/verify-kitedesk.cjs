/**
 * KiteDesk | chain verification: RPC, chain ID 2368, USDT + attestation bytecode (strict; used by npm run simulate)
 * Usage: node scripts/verify-kitedesk.cjs
 *
 * Loads .env then .env.local (later overrides), same as verify-backend.cjs.
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
require('dotenv').config({
  path: path.join(__dirname, '..', '.env.local'),
  override: true,
})

const { ethers } = require('ethers')

const DEFAULT_KITE_TESTNET_USDT = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63'
const MIN_BYTECODE_BYTES = 100

function ok(msg) {
  console.log('[ok]', msg)
}

function fail(msg) {
  console.error('[fail]', msg)
}

function byteLen(hex) {
  return hex && hex.startsWith('0x') ? (hex.length - 2) / 2 : 0
}

function has(v) {
  return typeof v === 'string' && v.trim().length > 0
}

async function main() {
  const rpc =
    process.env.KITE_RPC_URL ||
    process.env.NEXT_PUBLIC_KITE_RPC_URL ||
    'https://rpc-testnet.gokite.ai'

  const effectiveUsdt =
    process.env.KITE_USDT_CONTRACT?.trim() ||
    process.env.NEXT_PUBLIC_KITE_USDT_CONTRACT?.trim() ||
    DEFAULT_KITE_TESTNET_USDT

  const att =
    process.env.KITE_ATTESTATION_CONTRACT?.trim() ||
    process.env.NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT?.trim()

  let exitCode = 0

  const provider = new ethers.JsonRpcProvider(rpc)
  let chainId
  try {
    const net = await provider.getNetwork()
    chainId = Number(net.chainId)
  } catch (e) {
    fail(`RPC unreachable or invalid: ${rpc}`)
    console.error(e)
    process.exit(1)
  }

  ok(`RPC: ${rpc}`)
  if (chainId !== 2368) {
    fail(`Expected Kite testnet chain ID 2368, got ${chainId}`)
    exitCode = 1
  } else {
    ok('Chain ID 2368 (Kite testnet)')
  }

  if (!ethers.isAddress(effectiveUsdt)) {
    fail(`USDT address invalid: ${effectiveUsdt}`)
    exitCode = 1
  } else {
    const code = await provider.getCode(effectiveUsdt)
    const len = byteLen(code)
    if (len < MIN_BYTECODE_BYTES) {
      fail(
        `USDT at ${effectiveUsdt} has no or empty bytecode (${len} bytes). Confirm address on testnet.kitescan.ai`
      )
      exitCode = 1
    } else {
      ok(`USDT contract bytecode (${len} bytes) at ${effectiveUsdt}`)
    }
  }

  if (!has(att)) {
    fail(
      'Missing KITE_ATTESTATION_CONTRACT or NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT — deploy: npm run deploy:contracts'
    )
    exitCode = 1
  } else if (!ethers.isAddress(att)) {
    fail(`Attestation address invalid: ${att}`)
    exitCode = 1
  } else {
    const code = await provider.getCode(att)
    const len = byteLen(code)
    if (len < MIN_BYTECODE_BYTES) {
      fail(
        `Attestation at ${att} has no or empty bytecode (${len} bytes). Deploy KiteDeskAttestations to this address or fix env`
      )
      exitCode = 1
    } else {
      ok(`Attestation contract bytecode (${len} bytes) at ${att}`)
    }
  }

  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * KiteDesk | chain simulation: RPC reachability, USDT + attestation contract bytecode
 * Usage: node scripts/verify-kitedesk.cjs
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config()

const { ethers } = require('ethers')

async function main() {
  const rpc =
    process.env.KITE_RPC_URL ||
    process.env.NEXT_PUBLIC_KITE_RPC_URL ||
    'https://rpc-testnet.gokite.ai'
  const usdt =
    process.env.KITE_USDT_CONTRACT || process.env.NEXT_PUBLIC_KITE_USDT_CONTRACT
  const att =
    process.env.KITE_ATTESTATION_CONTRACT ||
    process.env.NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT

  const provider = new ethers.JsonRpcProvider(rpc)
  const net = await provider.getNetwork()
  console.log('RPC:', rpc)
  console.log('Chain ID:', Number(net.chainId))

  const byteLen = (hex) => (hex && hex.startsWith('0x') ? (hex.length - 2) / 2 : 0)

  if (usdt && ethers.isAddress(usdt)) {
    const code = await provider.getCode(usdt)
    console.log('USDT contract bytecode length:', byteLen(code), 'bytes')
  } else {
    console.log('USDT contract: not set')
  }

  if (att && ethers.isAddress(att)) {
    const code = await provider.getCode(att)
    console.log('Attestation contract bytecode length:', byteLen(code), 'bytes')
  } else {
    console.log('Attestation contract: not set')
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

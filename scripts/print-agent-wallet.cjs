// KiteDesk | print ATTESTATION_SIGNER_PRIVATE_KEY address (fund this wallet with testnet USDT for x402)
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
require('dotenv').config({
  path: path.join(__dirname, '..', '.env.local'),
  override: true,
})

const { ethers } = require('ethers')

const pk = process.env.ATTESTATION_SIGNER_PRIVATE_KEY?.trim()
if (!pk) {
  console.error('ATTESTATION_SIGNER_PRIVATE_KEY is not set in .env.local or .env')
  process.exit(1)
}

const w = new ethers.Wallet(pk)
console.log('Agent wallet address (fund with testnet KITE + USDT for x402):', w.address)

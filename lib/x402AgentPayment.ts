// KiteDesk | EIP-3009 X-PAYMENT payload for agent wallet (Pieverse facilitator settle)
import { ethers } from 'ethers'
import { KITE_CHAIN, KITE_RELAYER } from '@/lib/constants'

const PIEVERSE_FACILITATOR_ORIGIN = 'https://facilitator.pieverse.io'
const PIEVERSE_FACILITATOR_GET_URL = `${PIEVERSE_FACILITATOR_ORIGIN}/`
const PIEVERSE_FACILITATOR_VERIFY_URL = `${PIEVERSE_FACILITATOR_ORIGIN}/v2/verify`

const TRANSFER_WITH_AUTHORIZATION_TYPE: Array<{ name: string; type: string }> = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
]

const TOKEN_META_ABI = [
  'function name() view returns (string)',
  'function version() view returns (string)',
]

export async function buildXPaymentHeaderForFacilitator(
  wallet: ethers.Wallet,
  provider: ethers.JsonRpcProvider,
  params: { asset: string; payTo: string; value: bigint }
): Promise<string> {
  const tokenAddress = ethers.getAddress(params.asset)
  const payTo = ethers.getAddress(params.payTo)
  const meta = new ethers.Contract(tokenAddress, TOKEN_META_ABI, provider)
  let domainName = KITE_RELAYER.tokenDomainName
  let domainVersion = KITE_RELAYER.tokenDomainVersion
  try {
    domainName = await meta.name()
  } catch {
    // keep env fallback
  }
  try {
    domainVersion = await meta.version()
  } catch {
    // keep env fallback
  }

  const domain = {
    name: domainName,
    version: domainVersion,
    chainId: KITE_CHAIN.id,
    verifyingContract: tokenAddress,
  }

  const now = Math.floor(Date.now() / 1000)
  const validAfter = now - 60
  const validBefore = now + 3600
  const nonce = ethers.hexlify(ethers.randomBytes(32))

  const message = {
    from: wallet.address,
    to: payTo,
    value: params.value,
    validAfter,
    validBefore,
    nonce,
  }

  const signature = await wallet.signTypedData(domain, {
    TransferWithAuthorization: TRANSFER_WITH_AUTHORIZATION_TYPE,
  }, message)

  const authorization = {
    from: message.from,
    to: message.to,
    value: message.value.toString(),
    validAfter: validAfter.toString(),
    validBefore: validBefore.toString(),
    nonce: message.nonce,
  }

  const payload = { authorization, signature, asset: tokenAddress }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
}

export async function testFacilitatorConnectivity(): Promise<{
  facilitatorReachable: boolean
  verifyStatus: number
  verifyBody: unknown
}> {
  let facilitatorReachable = false
  let getStatus = 0
  let getBodyText = ''

  try {
    const getRes = await fetch(PIEVERSE_FACILITATOR_GET_URL, { method: 'GET' })
    getStatus = getRes.status
    getBodyText = await getRes.text()
    facilitatorReachable = true
  } catch (e) {
    facilitatorReachable = false
    getBodyText = e instanceof Error ? e.message : String(e)
  }

  let getBodyParsed: unknown = getBodyText
  if (getBodyText) {
    try {
      getBodyParsed = JSON.parse(getBodyText) as unknown
    } catch {
      // keep raw text
    }
  }

  console.error('[x402:test] GET', PIEVERSE_FACILITATOR_GET_URL, 'status:', getStatus)
  console.error('[x402:test] GET body:', getBodyParsed)

  let verifyStatus = 0
  let verifyBody: unknown = null

  try {
    const verifyRes = await fetch(PIEVERSE_FACILITATOR_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network: 'kite-testnet' }),
    })
    verifyStatus = verifyRes.status
    const text = await verifyRes.text()
    if (text) {
      try {
        verifyBody = JSON.parse(text) as unknown
      } catch {
        verifyBody = { raw: text.slice(0, 2000) }
      }
    }
  } catch (e) {
    verifyBody = { error: e instanceof Error ? e.message : String(e) }
  }

  console.error('[x402:test] POST', PIEVERSE_FACILITATOR_VERIFY_URL, 'status:', verifyStatus)
  console.error('[x402:test] POST body:', verifyBody)

  return { facilitatorReachable, verifyStatus, verifyBody }
}

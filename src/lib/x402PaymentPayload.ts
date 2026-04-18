// KiteDesk | parse X-Payment base64 JSON (authorization + signature + optional asset)

export type X402Authorization = {
  from: string
  to: string
  value: string
  validAfter: string
  validBefore: string
  nonce: string
}

export type ParsedXPayment = {
  authorization: X402Authorization
  signature: string
  asset?: string
}

function isHexAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s)
}

export function parseXPaymentHeader(raw: string): ParsedXPayment {
  const trimmed = raw.trim()
  let jsonStr: string
  try {
    jsonStr = Buffer.from(trimmed, 'base64').toString('utf8')
  } catch {
    throw new Error('Invalid base64 in X-PAYMENT payload')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr) as unknown
  } catch {
    throw new Error('Invalid JSON in X-PAYMENT payload')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('X-PAYMENT payload must be a JSON object')
  }
  const o = parsed as Record<string, unknown>
  const authorization = o.authorization
  const signature = o.signature
  if (
    authorization === undefined ||
    authorization === null ||
    typeof authorization !== 'object'
  ) {
    throw new Error('Missing authorization in X-PAYMENT payload')
  }
  if (typeof signature !== 'string' || !signature.startsWith('0x')) {
    throw new Error('Missing or invalid signature in X-PAYMENT payload')
  }
  const a = authorization as Record<string, unknown>
  const from = typeof a.from === 'string' ? a.from : ''
  const to = typeof a.to === 'string' ? a.to : ''
  const value = typeof a.value === 'string' ? a.value : ''
  const validAfter = typeof a.validAfter === 'string' ? a.validAfter : ''
  const validBefore = typeof a.validBefore === 'string' ? a.validBefore : ''
  const nonce = typeof a.nonce === 'string' ? a.nonce : ''
  if (!isHexAddress(from) || !isHexAddress(to)) {
    throw new Error('Invalid from or to in authorization')
  }
  if (!value || !/^\d+$/.test(value)) {
    throw new Error('Invalid value in authorization')
  }
  const asset =
    typeof o.asset === 'string' && isHexAddress(o.asset) ? o.asset : undefined
  return {
    authorization: { from, to, value, validAfter, validBefore, nonce },
    signature,
    asset,
  }
}

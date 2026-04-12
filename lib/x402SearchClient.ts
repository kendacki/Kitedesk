// KiteDesk | server-side HTTP client for /api/x402/search (absolute URL only — never relative fetch)
import { requireInternalApiBaseUrl } from '@/lib/internalApiBaseUrl'

const SEARCH_PATH = '/api/x402/search'

function agentLog(message: string, detail?: Record<string, unknown>) {
  const line = detail
    ? `[Agent] ${message} ${JSON.stringify(detail)}`
    : `[Agent] ${message}`
  console.error(line)
}

export async function fetchX402Search(opts: {
  query: string
  xPaymentHeader?: string
  phase?: 'first_pass' | 'retry'
}): Promise<{ status: number; body: unknown }> {
  const BASE_URL = requireInternalApiBaseUrl()
  const url = `${BASE_URL.replace(/\/$/, '')}${SEARCH_PATH}`
  const phase = opts.phase ?? 'first_pass'
  const hasPayment = Boolean(opts.xPaymentHeader?.trim())

  agentLog(`${phase === 'first_pass' ? 'Step: calling x402 resource' : 'Retrying request with X-Payment'}`, {
    url,
    phase,
    hasXPayment: hasPayment,
  })

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hasPayment ? { 'x-payment': opts.xPaymentHeader!.trim() } : {}),
      },
      body: JSON.stringify({ query: opts.query.trim() }),
      signal: AbortSignal.timeout(120_000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    agentLog('API call failed', { url, phase, error: msg })
    throw new Error(`fetch ${url} failed: ${msg}`)
  }

  agentLog(`HTTP response`, { phase, status: res.status })

  const text = await res.text()
  let body: unknown
  try {
    body = text ? (JSON.parse(text) as unknown) : {}
  } catch {
    body = { error: `Non-JSON response (${res.status}): ${text.slice(0, 240)}` }
  }

  if (res.status === 402 && phase === 'first_pass') {
    agentLog('Received 402 payment request', { phase })
  }

  return { status: res.status, body }
}

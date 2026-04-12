// KiteDesk | probe Pieverse facilitator + Kite x402 demo 402 body (run: node scripts/test-x402-facilitator.cjs)
import { testFacilitatorConnectivity } from '@/lib/x402AgentPayment'

const WEATHER_DEMO = 'https://x402.dev.gokite.ai/api/weather'

/** JSON body Pieverse /v2/settle receives from verify-and-settle (see lib/x402VerifySettleInternal.ts) */
const KITEDESK_SETTLE_NETWORK = 'kite-testnet'

/** First accept entry from buildX402Search402Body (see lib/x402SearchInternal.ts) */
const KITEDESK_402_SCHEME = 'gokite-aa'
const KITEDESK_402_NETWORK = 'kite-testnet'

async function main() {
  console.log('--- testFacilitatorConnectivity() (logs also emitted from lib) ---')
  const conn = await testFacilitatorConnectivity()
  console.log('return value:', JSON.stringify(conn, null, 2))

  console.log('\n--- GET', WEATHER_DEMO, '(no X-Payment; expect 402) ---')
  const weatherRes = await fetch(WEATHER_DEMO, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  console.log('status:', weatherRes.status)
  const wText = await weatherRes.text()
  let wBody: unknown
  try {
    wBody = wText ? (JSON.parse(wText) as unknown) : null
  } catch {
    wBody = { raw: wText.slice(0, 2000) }
  }
  console.log('full 402 response body:', JSON.stringify(wBody, null, 2))

  const accepts = (wBody as { accepts?: Array<{ scheme?: string; network?: string }> })
    ?.accepts
  const demo0 = Array.isArray(accepts) ? accepts[0] : undefined

  console.log(
    '\n--- Scheme / network: demo weather vs KiteDesk 402 vs verify-and-settle ---'
  )
  console.log(
    JSON.stringify(
      {
        'x402.dev.gokite.ai/api/weather (first accept)': demo0
          ? { scheme: demo0.scheme ?? null, network: demo0.network ?? null }
          : null,
        'KiteDesk 402 challenge (buildX402Search402Body)': {
          scheme: KITEDESK_402_SCHEME,
          network: KITEDESK_402_NETWORK,
        },
        'KiteDesk verify-and-settle POST /v2/settle JSON': {
          network: KITEDESK_SETTLE_NETWORK,
          note: 'scheme is implied by EIP-3009 authorization + signature payload, not a separate field',
        },
      },
      null,
      2
    )
  )

  if (demo0?.network && demo0.network !== KITEDESK_402_NETWORK) {
    console.log(
      '\n[compare] Demo network differs from KiteDesk challenge network string.'
    )
  }
  if (demo0?.scheme && demo0.scheme !== KITEDESK_402_SCHEME) {
    console.log(
      '\n[compare] Demo scheme differs from KiteDesk gokite-aa — Pieverse may still accept settle; check facilitator docs.'
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

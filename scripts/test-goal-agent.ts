// KiteDesk | local test for goal agent execution (no UI)
// Run from repo root: npm run test:goal
import { config } from 'dotenv'
import path from 'path'
import { executeGoal } from '../lib/agentOrchestrator'
import { HttpError } from '../lib/httpError'
import { requireInternalApiBaseUrl } from '../lib/internalApiBaseUrl'
import type { AgentStep } from '../types'

config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

type ExecuteGoalResult = Awaited<ReturnType<typeof executeGoal>>

const REQUIRED_ENV: { key: string; purpose: string }[] = [
  { key: 'GROQ_API_KEY', purpose: 'Planner + summarize (Groq)' },
  { key: 'TAVILY_API_KEY', purpose: 'Tavily after x402 settles' },
  {
    key: 'ATTESTATION_SIGNER_PRIVATE_KEY',
    purpose: 'Agent wallet: EIP-3009 / x402 payment + direct settle fallback',
  },
]

function missingEnvEntries(): { key: string; purpose: string }[] {
  return REQUIRED_ENV.filter(({ key }) => !process.env[key]?.trim())
}

function logMissingEnvDetailed(entries: { key: string; purpose: string }[]) {
  console.error('\n[test:goal] FATAL: missing environment variables:\n')
  for (const { key, purpose } of entries) {
    console.error(`  - ${key}`)
    console.error(`    ${purpose}`)
  }
  console.error('')
}

function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a
      if (a instanceof Error) return a.stack ?? a.message
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

async function runWithOrchestratorLogs<T>(
  fn: () => Promise<T>
): Promise<{ result: T; lines: string[] }> {
  const lines: string[] = []
  const orig = console.error
  console.error = (...args: unknown[]) => {
    orig(...args)
    const line = formatConsoleArgs(args)
    if (line.includes('[KiteDesk|x402]') || line.includes('[KiteDesk|tool]')) {
      lines.push(line)
    }
  }
  try {
    const result = await fn()
    return { result, lines }
  } finally {
    console.error = orig
  }
}

function printOrchestratorNarrative(lines: string[]) {
  console.log('\n--- x402 / tool trace (from orchestrator stderr) ---')
  if (lines.length === 0) {
    console.log('  (no [KiteDesk|x402] or [KiteDesk|tool] lines captured)')
    return
  }
  for (const line of lines) {
    console.log(' ', line)
  }

  const joined = lines.join('\n')
  const had402 =
    joined.includes('402_detected') ||
    (joined.includes('response_status') && joined.includes('"phase":"first_pass"') && joined.includes('402'))
  const hadPay =
    joined.includes('proceed_to_pay') ||
    joined.includes('build_x_payment') ||
    joined.includes('payment_decision')
  const retryOk =
    joined.includes('retry_result') &&
    (joined.includes('"ok":true') || joined.includes('"ok": true'))

  console.log('\n--- Interpretation ---')
  if (had402) console.log('  • 402: first pass reported HTTP 402 (payment required).')
  else console.log('  • 402: no explicit "402" in captured logs (first pass may have been 200).')
  if (hadPay) console.log('  • Payment: agent decided to pay (build X-Payment / settle path).')
  if (retryOk) console.log('  • Retry: paid request completed (retry success or HTTP 200).')
  else if (had402 && hadPay) console.log('  • Retry: check logs above — retry may have failed.')
}

function printStepDetail(s: AgentStep, index: number) {
  console.log(`\n  [Step ${index + 1}] #${s.stepNumber} ${s.description}`)
  const reasoning = typeof s.reasoning === 'string' ? s.reasoning : ''
  console.log(`    reasoning: ${reasoning.slice(0, 220)}${reasoning.length > 220 ? '…' : ''}`)
  if (s.stepKind) console.log(`    stepKind: ${s.stepKind}`)
  const tc = s.toolCall
  if (!tc) return
  console.log(`    tool: ${tc.toolName}`)
  console.log(`    costUsdt: ${tc.costUsdt} | durationMs: ${tc.durationMs}`)
  if (tc.paymentStatus) console.log(`    paymentStatus: ${tc.paymentStatus}`)
  if (tc.x402TxHash) console.log(`    x402TxHash: ${tc.x402TxHash}`)
  const inStr = typeof tc.input === 'string' ? tc.input : ''
  const outStr = typeof tc.output === 'string' ? tc.output : ''
  const inPreview = inStr.slice(0, 120).replace(/\s+/g, ' ')
  console.log(`    input (preview): ${inPreview}${inStr.length > 120 ? '…' : ''}`)
  const outPreview = outStr.slice(0, 160).replace(/\s+/g, ' ')
  console.log(`    output (preview): ${outPreview}${outStr.length > 160 ? '…' : ''}`)
}

function printX402SummaryFromResult(result: ExecuteGoalResult) {
  console.log('\n--- x402 summary (from result steps) ---')
  const paid = result.steps.filter((s) => s.toolCall?.paymentStatus === 'paid_via_x402')
  const freeSearch = result.steps.filter(
    (s) => s.toolCall?.toolName === 'web_search' && s.toolCall?.paymentStatus === 'free'
  )
  const budgetSkip = result.steps.filter(
    (s) => s.toolCall?.paymentStatus === 'budget_exceeded'
  )

  if (paid.length > 0) {
    console.log(`  Paid x402 path: ${paid.length} step(s), total tracked USDT: ${result.x402TotalPaidUsdt}`)
    for (const s of paid) {
      const tc = s.toolCall!
      console.log(`    - ${tc.toolName} cost ${tc.costUsdt} tx ${tc.x402TxHash ?? '(none)'}`)
    }
  } else {
    console.log('  No steps with paymentStatus=paid_via_x402.')
  }
  if (freeSearch.length > 0) {
    console.log(
      `  web_search with paymentStatus=free: ${freeSearch.length} (first HTTP pass returned 200 without charging).`
    )
  }
  if (budgetSkip.length > 0) {
    console.log('  Budget skip (x402 not paid):', budgetSkip.length)
  }
}

async function probeInternalX402Search(base: string): Promise<void> {
  const url = `${base.replace(/\/$/, '')}/api/x402/search`
  console.log('\n[test:goal] Probing INTERNAL_API_BASE_URL → POST', url)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '__kitedesk_probe__' }),
      signal: AbortSignal.timeout(30_000),
    })
    const text = await res.text()
    console.log(`[test:goal] Probe HTTP status: ${res.status}`)
    if (res.status === 402) {
      console.log(
        '[test:goal] Probe: 402 Payment Required — endpoint reachable; x402 challenge flow can start.'
      )
    } else if (res.status === 200) {
      console.log('[test:goal] Probe: 200 — server returned search without 402 for this query.')
    } else {
      console.log(
        `[test:goal] Probe body (first 400 chars): ${text.slice(0, 400)}${text.length > 400 ? '…' : ''}`
      )
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const name = e instanceof Error ? e.name : 'Error'
    console.error(
      '\n[test:goal] FATAL: API probe failed (check NEXT_PUBLIC_APP_URL / INTERNAL_API_BASE_URL / VERCEL_URL and that the app is running).'
    )
    console.error(`[test:goal]   URL: ${url}`)
    console.error(`[test:goal]   ${name}: ${msg}`)
    if (e instanceof Error && e.stack) console.error(e.stack)
    throw e
  }
}

async function main() {
  console.log('\n=== KiteDesk test:goal (full backend / x402) ===\n')

  const missing = missingEnvEntries()
  if (missing.length > 0) {
    logMissingEnvDetailed(missing)
    process.exitCode = 1
    return
  }
  console.log('[test:goal] Required env present:', REQUIRED_ENV.map((e) => e.key).join(', '))

  let base: string
  try {
    base = requireInternalApiBaseUrl()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[test:goal] FATAL: could not resolve internal API base URL')
    console.error(msg)
    console.error(
      'Set INTERNAL_API_BASE_URL or NEXT_PUBLIC_APP_URL (dev: defaults to http://127.0.0.1:3000).'
    )
    process.exitCode = 1
    return
  }
  console.log('[test:goal] Resolved internal API base URL:', base)

  try {
    await probeInternalX402Search(base)
  } catch {
    process.exitCode = 1
    return
  }

  const cases: { goal: string; budget: number }[] = [
    { goal: 'Find the best budget mechanical keyboard under $100', budget: 0.4 },
    { goal: 'What are the latest developments in AI agent payments', budget: 0.25 },
  ]

  for (let ci = 0; ci < cases.length; ci++) {
    const { goal, budget } = cases[ci]
    console.log('\n' + '='.repeat(60))
    console.log(`CASE ${ci + 1}/${cases.length}`)
    console.log('='.repeat(60))
    console.log('Goal:', goal)
    console.log('Budget USDT:', budget)

    try {
      const { result, lines } = await runWithOrchestratorLogs(() => executeGoal(goal, budget))

      printOrchestratorNarrative(lines)

      console.log('\n--- Planner ---')
      console.log(result.planReasoning ?? '(none)')

      console.log('\n--- Execution steps (detail) ---')
      result.steps.forEach((s, i) => printStepDetail(s, i))

      printX402SummaryFromResult(result)

      console.log('\n--- Totals ---')
      console.log('  totalSpentUsdt:', result.totalSpentUsdt)
      console.log('  remainingBudget:', result.remainingBudget)
      console.log('  x402PaymentsCount:', result.x402PaymentsCount)
      console.log('  x402TotalPaidUsdt:', result.x402TotalPaidUsdt)
      console.log('  skippedTools:', result.skippedTools?.join(', ') || '(none)')

      console.log('\n--- Final output (first 400 chars) ---')
      const fo =
        typeof result.finalOutput === 'string' ? result.finalOutput : String(result.finalOutput ?? '')
      console.log(fo.slice(0, 400).replace(/\s+/g, ' ') + (fo.length > 400 ? '…' : ''))
    } catch (e) {
      console.error('\n[test:goal] --- GOAL RUN FAILED ---')
      if (e instanceof HttpError) {
        console.error(`[test:goal] HttpError status: ${e.status}`)
        console.error(`[test:goal] message: ${e.message}`)
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[test:goal] message: ${msg}`)
        if (e instanceof Error && e.stack) console.error(e.stack)
      }
      process.exitCode = 1
      return
    }
  }

  console.log('\n=== test:goal finished OK ===\n')
}

main().catch((e) => {
  console.error('[test:goal] unhandled:', e)
  process.exitCode = 1
})

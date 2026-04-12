// KiteDesk | multi-step goal agent — real API execution with budget constraints
import { ethers } from 'ethers'
import Groq from 'groq-sdk'
import { HttpError } from '@/lib/httpError'
import { getTotalCost, TOOL_REGISTRY, x402FlowDebug } from '@/lib/tools'
import { KITE_CHAIN, KITE_X402 } from '@/lib/constants'
import { requireInternalApiBaseUrl } from '@/lib/internalApiBaseUrl'
import { buildXPaymentHeaderForFacilitator } from '@/lib/x402AgentPayment'
import { fetchX402Search } from '@/lib/x402SearchClient'
import type { AgentStep, GoalResult, ToolName } from '@/types'

const DEFAULT_MODEL = 'openai/gpt-oss-120b'

const ERC20_BALANCE_ABI = ['function balanceOf(address owner) view returns (uint256)'] as const

const PLANNER_SYSTEM_PROMPT = `You are an autonomous economic agent with access to real external APIs.
Your job: achieve the user's goal with minimum cost while staying within budget.

Available tools (you pay per call from the user's budget):
- web_search: $0.05 — live web search via Tavily via x402 paid API on this app (HTTP 402 → agent wallet pays USDT autonomously — this is the agentic commerce demo path)
- news_fetch: $0.04 — recent news articles, good for current events
- price_check: $0.05 — current market prices, good for product research
- competitor_analysis: $0.08 — alternatives and comparisons, expensive, use sparingly
- deep_read: $0.06 — read full content of a specific URL, use when you need detail
- summarize: $0.02 — synthesize findings into recommendation, ALWAYS use as final step

Rules:
- ALWAYS include at least one web_search step in the plan (before summarize) whenever the goal needs the public web, current facts, or research — almost every goal does. Omit web_search only if the goal is purely internal math with no lookup need.
- List web_search before news_fetch, price_check, competitor_analysis, or deep_read so the x402 paid search runs first (server enforces this order).
- Always end with summarize
- Never exceed the budget
- Use the cheapest tool that gets the job done
- If budget < $0.20, avoid competitor_analysis and deep_read
- Chain tools logically: web_search first for breadth, then deep_read on specific URLs if needed
- Justify each step clearly in reasoning

Return ONLY valid JSON with no markdown:
{
  "plan": [
    { "stepNumber": 1, "toolName": "web_search", "inputPrompt": "specific search query here", "reasoning": "why this tool for this step" }
  ],
  "estimatedCost": 0.17,
  "planReasoning": "one sentence explaining overall strategy"
}`

type PlanRow = {
  stepNumber: number
  toolName: string
  inputPrompt: string
  reasoning: string
}

type PlannerJson = {
  plan?: PlanRow[]
  estimatedCost?: number
  planReasoning?: string
}

type X402AcceptsEntry = {
  maxAmountRequired?: string
  payTo?: string
  asset?: string
}

type X402ChallengeBody = {
  accepts?: X402AcceptsEntry[]
  error?: string
}

type SearchApiOk = {
  answer?: string
  results?: unknown[]
  settlementTxHash?: string
}

export type ExecuteX402ToolResult =
  | { skipped: true; reason: 'budget_exceeded' }
  | {
      ok: true
      output: string
      paidUsdt: number
      x402TxHash?: string
      paymentStatus: 'paid_via_x402' | 'free'
    }
  | { ok: false; error: string }

function normalizeMessageContent(content: unknown): string {
  if (content === null || content === undefined) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'object' && part !== null && 'text' in part) {
          return String((part as { text?: string }).text ?? '')
        }
        return ''
      })
      .join('')
  }
  return String(content)
}

function extractJsonObject(text: string): string {
  const t = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  if (fence) return fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) return t.slice(start, end + 1)
  return t
}

function isToolName(name: string): name is ToolName {
  return name in TOOL_REGISTRY
}

function planCostForTools(names: ToolName[]): number {
  return getTotalCost(names)
}

function agentLog(message: string, detail?: Record<string, unknown>) {
  const line = detail
    ? `[Agent] ${message} ${JSON.stringify(detail)}`
    : `[Agent] ${message}`
  console.error(line)
}

/** web_search / x402 steps always run before other tools (no free APIs before paid search). */
function sortWebSearchFirst(rows: PlanRow[]): PlanRow[] {
  const ws = rows.filter((r) => r.toolName === 'web_search')
  const rest = rows.filter((r) => r.toolName !== 'web_search')
  const merged = [...ws, ...rest]
  return merged.map((r, i) => ({ ...r, stepNumber: i + 1 }))
}

/**
 * Ensures the plan includes web_search so executeX402Tool runs the HTTP x402 flow (agent pays via wallet).
 * If the LLM omitted web_search, prepends it and drops tail steps until the budget fits.
 */
function ensureWebSearchInPlan(
  trimmed: PlanRow[],
  budgetUsdt: number,
  goal: string,
  skippedTools: string[]
): PlanRow[] {
  const synthCost = TOOL_REGISTRY.summarize.costUsdt
  const wsCost = TOOL_REGISTRY.web_search.costUsdt
  if (trimmed.some((r) => r.toolName === 'web_search')) {
    return trimmed
  }
  if (budgetUsdt < wsCost + synthCost) {
    return trimmed
  }

  const injected: PlanRow = {
    stepNumber: 1,
    toolName: 'web_search',
    inputPrompt: `Find current information and sources for: ${goal.trim().slice(0, 400)}`,
    reasoning:
      'KiteDesk policy: web_search runs the x402 paid HTTP flow so the agent demonstrates autonomous on-chain payment.',
  }

  let next: PlanRow[] = [injected, ...trimmed.map((r) => ({ ...r }))]
  next = next.map((r, i) => ({ ...r, stepNumber: i + 1 }))

  while (
    next.length > 1 &&
    planCostForTools(next.map((r) => r.toolName as ToolName)) + synthCost > budgetUsdt
  ) {
    const dropped = next.pop()!
    skippedTools.push(dropped.toolName)
  }

  const totalCost =
    planCostForTools(next.map((r) => r.toolName as ToolName)) + synthCost
  if (totalCost > budgetUsdt || !next.some((r) => r.toolName === 'web_search')) {
    return trimmed
  }
  return next
}

function buildContextualInput(row: PlanRow, priorSteps: AgentStep[]): string {
  const prior = priorSteps
    .filter((s) => s.toolCall && s.toolCall.toolName !== 'summarize')
    .map((s) => {
      const tc = s.toolCall!
      const out = (tc.output ?? '').slice(0, 1200)
      return `Step ${s.stepNumber} (${tc.toolName}): ${out}`
    })
    .join('\n\n')
  if (!prior.trim()) return row.inputPrompt
  return `Prior research context:\n${prior}\n\nCurrent task:\n${row.inputPrompt}`
}

export type ExecuteX402ToolContext = {
  /** e.g. Step 1/3 — for demo logs */
  stepLabel?: string
}

/**
 * x402 tool execution: HTTP POST to INTERNAL_API_BASE_URL/api/x402/search; EIP-3009 X-Payment + facilitator or direct USDT transfer.
 * Goal mode: first request must return 402 (no free 200 before payment).
 */
export async function executeX402Tool(
  toolName: ToolName,
  input: string,
  budgetUsdt: number,
  accumulatedUsdt: number,
  ctx?: ExecuteX402ToolContext
): Promise<ExecuteX402ToolResult> {
  if (toolName !== 'web_search') {
    const out = await TOOL_REGISTRY[toolName].execute(input)
    return {
      ok: true,
      output: out,
      paidUsdt: TOOL_REGISTRY[toolName].costUsdt,
      paymentStatus: 'free',
    }
  }

  const base = requireInternalApiBaseUrl()
  const searchUrl = `${base}/api/x402/search`
  const q = input.trim()
  const label = ctx?.stepLabel ?? 'Step'

  agentLog(`${label}: calling x402 resource`, { url: searchUrl })
  x402FlowDebug.apiCallStart('first_pass', searchUrl, false)

  let first: { status: number; body: unknown }
  try {
    first = await fetchX402Search({ query: q, phase: 'first_pass' })
  } catch (e) {
    x402FlowDebug.networkError('first_pass', e)
    agentLog('x402 first request failed', {
      error: e instanceof Error ? e.message : String(e),
    })
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }

  x402FlowDebug.responseStatus('first_pass', first.status)

  if (first.status === 200) {
    agentLog('Expected 402 on first request — got 200 (refusing free path)', { stepLabel: label })
    return {
      ok: false,
      error:
        'Forced x402: first request to /api/x402/search must return 402 Payment Required before search results (got 200).',
    }
  }

  if (first.status !== 402) {
    const preview =
      typeof first.body === 'object' && first.body !== null && 'error' in first.body
        ? String((first.body as { error?: string }).error ?? '')
        : JSON.stringify(first.body).slice(0, 500)
    x402FlowDebug.unexpectedFirstStatus(first.status, preview.slice(0, 200))
    return {
      ok: false,
      error: `x402 search unexpected status ${first.status}: ${preview}`,
    }
  }

  const challenge = first.body as X402ChallengeBody
  agentLog('Received 402 payment request', {
    acceptsCount: challenge.accepts?.length ?? 0,
  })
  x402FlowDebug.detected402(challenge.accepts?.length ?? 0, challenge.error)

  const acc = challenge.accepts?.[0]
  if (!acc?.maxAmountRequired || !acc.payTo || !acc.asset) {
    return { ok: false, error: '402 response missing accepts[0] payment fields' }
  }

  let maxWei: bigint
  try {
    maxWei = BigInt(acc.maxAmountRequired)
  } catch {
    return { ok: false, error: 'Invalid maxAmountRequired in 402' }
  }

  let payTo: string
  let asset: string
  try {
    payTo = ethers.getAddress(acc.payTo)
    asset = ethers.getAddress(acc.asset)
  } catch {
    return { ok: false, error: 'Invalid payTo or asset in 402' }
  }

  const pk = process.env.ATTESTATION_SIGNER_PRIVATE_KEY?.trim()
  if (!pk) {
    return { ok: false, error: 'ATTESTATION_SIGNER_PRIVATE_KEY is not configured' }
  }

  const provider = new ethers.JsonRpcProvider(KITE_CHAIN.rpcUrl)
  const decimals = KITE_X402.stablecoinDecimals
  const priceUsdt = parseFloat(ethers.formatUnits(maxWei, decimals))

  if (!Number.isFinite(priceUsdt) || priceUsdt < 0) {
    return { ok: false, error: 'Could not derive price from 402 maxAmountRequired' }
  }

  agentLog(`Cost: ${priceUsdt.toFixed(4)} USDT (from 402)`, { budgetUsdt, accumulatedUsdt })

  if (accumulatedUsdt + priceUsdt > budgetUsdt) {
    agentLog('Over budget — skipping x402 payment', { priceUsdt, budgetUsdt, accumulatedUsdt })
    x402FlowDebug.paymentDecision({
      action: 'skip_budget',
      priceUsdt,
      accumulatedUsdt,
      budgetUsdt,
      payTo,
      asset,
    })
    return { skipped: true, reason: 'budget_exceeded' }
  }

  const wallet = new ethers.Wallet(pk, provider)

  const tokenRead = new ethers.Contract(asset, ERC20_BALANCE_ABI, provider)
  let balance: bigint
  try {
    balance = await tokenRead.balanceOf(wallet.address)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Could not read agent USDT balance: ${msg}` }
  }

  if (balance < maxWei) {
    const formattedBalance = ethers.formatUnits(balance, decimals)
    const formattedNeeded = ethers.formatUnits(maxWei, decimals)
    x402FlowDebug.paymentDecision({
      action: 'insufficient_agent_balance',
      agentWallet: wallet.address,
      priceUsdt,
      payTo,
      asset,
      detail: `balance ${formattedBalance} need ${formattedNeeded}`,
    })
    console.error('[x402] agent wallet for settlement (fund this address for x402 USDT):', wallet.address)
    return {
      ok: false,
      error: `Agent wallet ${wallet.address} has insufficient testnet USDT balance. Fund it at https://faucet.gokite.ai — balance: ${formattedBalance}, needed: ${formattedNeeded}`,
    }
  }

  agentLog('Within budget → paying', {
    priceUsdt,
    payTo,
    asset,
    agentWallet: wallet.address,
  })

  x402FlowDebug.paymentDecision({
    action: 'proceed_to_pay',
    priceUsdt,
    accumulatedUsdt,
    budgetUsdt,
    payTo,
    asset,
    agentWallet: wallet.address,
  })

  let xPayment: string
  try {
    x402FlowDebug.paymentDecision({ action: 'build_x_payment', payTo, asset, priceUsdt })
    xPayment = await buildXPaymentHeaderForFacilitator(wallet, provider, {
      asset,
      payTo,
      value: maxWei,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Failed to build X-Payment: ${msg}` }
  }

  agentLog('Payment success', { step: 'x_payment_built' })
  agentLog('Retrying request', { step: 'paid_search' })
  x402FlowDebug.apiCallStart('retry', searchUrl, true)

  let second: { status: number; body: unknown }
  try {
    second = await fetchX402Search({
      query: q,
      xPaymentHeader: xPayment,
      phase: 'retry',
    })
  } catch (e) {
    x402FlowDebug.networkError('retry', e)
    agentLog('Retry request failed', { error: e instanceof Error ? e.message : String(e) })
    const msg = e instanceof Error ? e.message : String(e)
    x402FlowDebug.retryResult({ status: 0, ok: false, errorPreview: msg })
    return { ok: false, error: msg }
  }

  x402FlowDebug.responseStatus('retry', second.status)

  if (second.status !== 200) {
    const preview =
      typeof second.body === 'object' && second.body !== null && 'error' in second.body
        ? String((second.body as { error?: string }).error ?? '')
        : JSON.stringify(second.body).slice(0, 500)
    x402FlowDebug.retryResult({
      status: second.status,
      ok: false,
      errorPreview: preview.slice(0, 300),
    })
    return {
      ok: false,
      error: `x402 search after payment failed ${second.status}: ${preview}`,
    }
  }

  const data = second.body as SearchApiOk
  const settlementTxHash =
    typeof data.settlementTxHash === 'string' ? data.settlementTxHash : undefined
  agentLog('Success — search completed after x402 payment', {
    httpStatus: second.status,
    settlementTxHash: settlementTxHash ?? '(none)',
  })
  const out = JSON.stringify({
    answer: data.answer ?? '',
    results: data.results ?? [],
  })

  x402FlowDebug.retryResult({
    status: second.status,
    ok: true,
    settlementTxHash,
  })

  return {
    ok: true,
    output: out,
    paidUsdt: priceUsdt,
    x402TxHash: settlementTxHash,
    paymentStatus: 'paid_via_x402',
  }
}

async function runPlanner(
  goal: string,
  budgetUsdt: number
): Promise<{ bodyPlan: PlanRow[]; planReasoning: string; skippedTools: string[] }> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new HttpError('GROQ_API_KEY is not configured', 503)
  }
  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL
  const client = new Groq({ apiKey })
  const userPayload = `Goal:\n${goal.trim()}\n\nBudget (USDT): ${budgetUsdt}\n\nRespond with JSON only.`
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: PLANNER_SYSTEM_PROMPT },
      { role: 'user', content: userPayload },
    ],
  })
  const raw = completion.choices[0]?.message?.content
  const text = normalizeMessageContent(raw).trim()
  if (!text) {
    throw new HttpError('Planner returned no output', 502)
  }
  let parsed: PlannerJson
  try {
    parsed = JSON.parse(extractJsonObject(text)) as PlannerJson
  } catch {
    throw new HttpError('Planner returned invalid JSON', 502)
  }
  const planReasoning =
    typeof parsed.planReasoning === 'string' && parsed.planReasoning.trim()
      ? parsed.planReasoning.trim()
      : 'Planner did not return plan reasoning.'

  const rows = Array.isArray(parsed.plan) ? parsed.plan : []
  const valid: PlanRow[] = []
  for (const row of rows) {
    if (
      !row ||
      typeof row.toolName !== 'string' ||
      typeof row.inputPrompt !== 'string' ||
      typeof row.reasoning !== 'string'
    ) {
      continue
    }
    if (!isToolName(row.toolName)) continue
    valid.push({
      stepNumber:
        typeof row.stepNumber === 'number' ? row.stepNumber : valid.length + 1,
      toolName: row.toolName,
      inputPrompt: row.inputPrompt,
      reasoning: row.reasoning,
    })
  }
  if (valid.length === 0) {
    throw new HttpError('Planner produced an empty plan', 502)
  }

  let body = valid.filter((r) => r.toolName !== 'summarize')
  const skippedTools: string[] = []

  if (budgetUsdt < 0.2) {
    for (const r of body) {
      if (r.toolName === 'competitor_analysis' || r.toolName === 'deep_read') {
        skippedTools.push(r.toolName)
      }
    }
    body = body.filter(
      (r) => r.toolName !== 'competitor_analysis' && r.toolName !== 'deep_read'
    )
  }

  if (body.length === 0) {
    throw new HttpError('Planner produced no executable steps after budget rules', 502)
  }

  const synthCost = TOOL_REGISTRY.summarize.costUsdt
  if (synthCost > budgetUsdt) {
    throw new HttpError('Budget too small for minimum execution', 400)
  }

  const fullBody = [...body]
  let trimmed = [...body]
  while (
    trimmed.length > 0 &&
    planCostForTools(trimmed.map((r) => r.toolName as ToolName)) + synthCost >
      budgetUsdt
  ) {
    trimmed = trimmed.slice(0, -1)
  }

  for (const dropped of fullBody.slice(trimmed.length)) {
    skippedTools.push(dropped.toolName)
  }

  if (trimmed.length === 0) {
    throw new HttpError('Budget too small for planned tools plus summarize', 400)
  }

  trimmed = ensureWebSearchInPlan(trimmed, budgetUsdt, goal.trim(), skippedTools)

  return { bodyPlan: trimmed, planReasoning, skippedTools }
}

export async function executeGoal(
  goal: string,
  budgetUsdt: number
): Promise<
  Omit<GoalResult, 'taskId' | 'txHash' | 'attestationHash' | 'attestationUrl'>
> {
  const g = goal.trim()
  if (!g) {
    throw new HttpError('Goal cannot be empty', 400)
  }

  const {
    bodyPlan: rawPlan,
    planReasoning,
    skippedTools: skippedFromPlanner,
  } = await runPlanner(g, budgetUsdt)
  const bodyPlan = sortWebSearchFirst(rawPlan)
  const skippedTools = [...skippedFromPlanner]
  const steps: AgentStep[] = []
  let accumulated = 0
  const synthCost = TOOL_REGISTRY.summarize.costUsdt

  for (let i = 0; i < bodyPlan.length; i++) {
    const row = bodyPlan[i]
    const toolName = row.toolName as ToolName
    const registryCost = TOOL_REGISTRY[toolName].costUsdt

    if (toolName !== 'web_search') {
      if (accumulated + registryCost > budgetUsdt) {
        steps.push({
          stepNumber: steps.length + 1,
          description: 'Stopped: budget reached before running this tool',
          reasoning: `Need ${registryCost} USDT but only ${(budgetUsdt - accumulated).toFixed(4)} USDT left.`,
          completedAt: Date.now(),
        })
        skippedTools.push(toolName)
        for (const rest of bodyPlan.slice(i + 1)) {
          skippedTools.push(rest.toolName)
        }
        break
      }
    }

    const toolInput = buildContextualInput(row, steps)
    const started = Date.now()

    if (toolName === 'web_search') {
      agentLog('Forced x402 step triggered', {
        endpoint: '/api/x402/search',
        planStep: i + 1,
      })
      const xr = await executeX402Tool(toolName, toolInput, budgetUsdt, accumulated, {
        stepLabel: `Step ${i + 1}/${bodyPlan.length}`,
      })
      const durationMs = Date.now() - started

      if ('skipped' in xr) {
        steps.push({
          stepNumber: steps.length + 1,
          description: TOOL_REGISTRY.web_search.description,
          reasoning: row.reasoning,
          completedAt: Date.now(),
          stepKind: 'x402_payment',
          toolCall: {
            toolName: 'web_search',
            input: toolInput,
            output: JSON.stringify({ skipped: true, reason: xr.reason }),
            costUsdt: 0,
            durationMs,
            paymentStatus: 'budget_exceeded',
          },
        })
        skippedTools.push('web_search')
        for (const rest of bodyPlan.slice(i + 1)) {
          skippedTools.push(rest.toolName)
        }
        break
      }

      if (!xr.ok) {
        throw new HttpError(xr.error, 502)
      }

      accumulated += xr.paidUsdt
      steps.push({
        stepNumber: steps.length + 1,
        description: TOOL_REGISTRY.web_search.description,
        reasoning: row.reasoning,
        completedAt: Date.now(),
        stepKind: xr.paymentStatus === 'paid_via_x402' ? 'x402_payment' : undefined,
        toolCall: {
          toolName: 'web_search',
          input: toolInput,
          output: xr.output,
          costUsdt: xr.paidUsdt,
          durationMs,
          x402TxHash: xr.x402TxHash,
          paymentStatus: xr.paymentStatus,
        },
      })
      continue
    }

    const output = await TOOL_REGISTRY[toolName].execute(toolInput)
    const durationMs = Date.now() - started
    accumulated += registryCost
    steps.push({
      stepNumber: steps.length + 1,
      description: TOOL_REGISTRY[toolName].description,
      reasoning: row.reasoning,
      completedAt: Date.now(),
      toolCall: {
        toolName,
        input: toolInput,
        output,
        costUsdt: registryCost,
        durationMs,
        paymentStatus: 'free',
      },
    })
  }

  const researchCollected = steps
    .map((s) => {
      const name = s.toolCall?.toolName ?? 'stop'
      const body = s.toolCall?.output ?? s.reasoning ?? ''
      return `Step ${s.stepNumber} (${name}): ${body}`
    })
    .join('\n\n')
  const synthesisInput = `Goal: ${g}\n\nResearch collected:\n${researchCollected}`

  let finalOutput: string
  if (accumulated + synthCost <= budgetUsdt) {
    const started = Date.now()
    finalOutput = await TOOL_REGISTRY.summarize.execute(synthesisInput)
    const durationMs = Date.now() - started
    accumulated += synthCost
    steps.push({
      stepNumber: steps.length + 1,
      description: TOOL_REGISTRY.summarize.description,
      reasoning: 'Final synthesis of all tool outputs',
      completedAt: Date.now(),
      toolCall: {
        toolName: 'summarize',
        input: synthesisInput.slice(0, 500) + (synthesisInput.length > 500 ? '…' : ''),
        output: finalOutput,
        costUsdt: synthCost,
        durationMs,
        paymentStatus: 'free',
      },
    })
  } else {
    finalOutput =
      researchCollected || 'Budget exhausted before final synthesis could run.'
  }

  const uniqueSkipped = Array.from(new Set(skippedTools))
  const completedAt = Date.now()

  let x402PaymentsCount = 0
  let x402TotalPaidUsdt = 0
  for (const s of steps) {
    if (s.toolCall?.paymentStatus !== 'paid_via_x402') continue
    x402PaymentsCount += 1
    const c = s.toolCall.costUsdt
    if (typeof c === 'number' && Number.isFinite(c)) {
      x402TotalPaidUsdt += c
    }
  }

  return {
    goal: g,
    budgetUsdt,
    steps,
    totalSpentUsdt: accumulated,
    remainingBudget: Math.max(0, budgetUsdt - accumulated),
    finalOutput,
    completedAt,
    planReasoning,
    skippedTools: uniqueSkipped,
    x402PaymentsCount,
    x402TotalPaidUsdt,
  }
}

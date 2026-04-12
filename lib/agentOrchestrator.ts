// KiteDesk | multi-step goal agent — real API execution with budget constraints
import { ethers } from 'ethers'
import Groq from 'groq-sdk'
import { HttpError } from '@/lib/httpError'
import { getTotalCost, TOOL_REGISTRY } from '@/lib/tools'
import { KITE_CHAIN } from '@/lib/constants'
import { buildXPaymentHeaderForFacilitator } from '@/lib/x402AgentPayment'
import { executeX402SearchInternal } from '@/lib/x402SearchInternal'
import type { AgentStep, GoalResult, ToolName } from '@/types'

const DEFAULT_MODEL = 'openai/gpt-oss-120b'

const ERC20_BALANCE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
] as const

const PLANNER_SYSTEM_PROMPT = `You are an autonomous economic agent with access to real external APIs.
Your job: achieve the user's goal with minimum cost while staying within budget.

Available tools (you pay per call from the user's budget):
- web_search: $0.05 — live web search via Tavily via x402 paid API on this app
- news_fetch: $0.04 — recent news articles, good for current events
- price_check: $0.05 — current market prices, good for product research
- competitor_analysis: $0.08 — alternatives and comparisons, expensive, use sparingly
- deep_read: $0.06 — read full content of a specific URL, use when you need detail
- summarize: $0.02 — synthesize findings into recommendation, ALWAYS use as final step

Rules:
- Always end with summarize
- Never exceed the budget
- Use the cheapest tool that gets the job done
- If budget < $0.20, avoid competitor_analysis and deep_read
- Chain tools logically: search first, then deep_read specific results if needed
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

function getInternalApiBaseUrl(): string {
  const fromEnv =
    process.env.INTERNAL_API_BASE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  const port = process.env.PORT ?? '3000'
  return `http://127.0.0.1:${port}`
}

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

function buildContextualInput(row: PlanRow, priorSteps: AgentStep[]): string {
  const prior = priorSteps
    .filter((s) => s.toolCall && s.toolCall.toolName !== 'summarize')
    .map(
      (s) =>
        `Step ${s.stepNumber} (${s.toolCall!.toolName}): ${s.toolCall!.output.slice(0, 1200)}`
    )
    .join('\n\n')
  if (!prior) return row.inputPrompt
  return `Prior research context:\n${prior}\n\nCurrent task:\n${row.inputPrompt}`
}

async function readTokenDecimals(
  provider: ethers.JsonRpcProvider,
  asset: string
): Promise<number> {
  const c = new ethers.Contract(asset, ['function decimals() view returns (uint8)'], provider)
  try {
    const d = await c.decimals()
    return Number(d)
  } catch {
    return 18
  }
}

/**
 * x402 tool execution: internal paid search (no self-HTTP); EIP-3009 X-Payment + facilitator or direct USDT transfer.
 */
export async function executeX402Tool(
  toolName: ToolName,
  input: string,
  budgetUsdt: number,
  accumulatedUsdt: number
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

  const base = getInternalApiBaseUrl()

  const first = await executeX402SearchInternal({
    query: input.trim(),
    resourceBase: base,
  })

  if (first.status === 200) {
    const raw = first.body as SearchApiOk
    const out = JSON.stringify({
      answer: raw.answer ?? '',
      results: raw.results ?? [],
    })
    return { ok: true, output: out, paidUsdt: 0, paymentStatus: 'free' }
  }

  if (first.status !== 402) {
    const preview =
      typeof first.body === 'object' && first.body !== null && 'error' in first.body
        ? String((first.body as { error?: string }).error ?? '')
        : JSON.stringify(first.body).slice(0, 500)
    return {
      ok: false,
      error: `x402 search unexpected status ${first.status}: ${preview}`,
    }
  }

  const challenge = first.body as X402ChallengeBody

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
  const decimals = await readTokenDecimals(provider, asset)
  const priceUsdt = parseFloat(ethers.formatUnits(maxWei, decimals))

  if (!Number.isFinite(priceUsdt) || priceUsdt < 0) {
    return { ok: false, error: 'Could not derive price from 402 maxAmountRequired' }
  }

  if (accumulatedUsdt + priceUsdt > budgetUsdt) {
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
    console.error('[x402] agent wallet for settlement (fund this address for x402 USDT):', wallet.address)
    return {
      ok: false,
      error: `Agent wallet ${wallet.address} has insufficient testnet USDT balance. Fund it at https://faucet.gokite.ai — balance: ${formattedBalance}, needed: ${formattedNeeded}`,
    }
  }

  let xPayment: string
  try {
    xPayment = await buildXPaymentHeaderForFacilitator(wallet, provider, {
      asset,
      payTo,
      value: maxWei,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Failed to build X-Payment: ${msg}` }
  }

  const second = await executeX402SearchInternal({
    query: input.trim(),
    resourceBase: base,
    xPaymentHeader: xPayment,
  })

  if (second.status !== 200) {
    const preview =
      typeof second.body === 'object' && second.body !== null && 'error' in second.body
        ? String((second.body as { error?: string }).error ?? '')
        : JSON.stringify(second.body).slice(0, 500)
    return {
      ok: false,
      error: `x402 search after payment failed ${second.status}: ${preview}`,
    }
  }

  const data = second.body as SearchApiOk
  const out = JSON.stringify({
    answer: data.answer ?? '',
    results: data.results ?? [],
  })

  return {
    ok: true,
    output: out,
    paidUsdt: priceUsdt,
    x402TxHash:
      typeof data.settlementTxHash === 'string' ? data.settlementTxHash : undefined,
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
    bodyPlan,
    planReasoning,
    skippedTools: skippedFromPlanner,
  } = await runPlanner(g, budgetUsdt)
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
      const xr = await executeX402Tool(toolName, toolInput, budgetUsdt, accumulated)
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
    .map((s) => `Step ${s.stepNumber} (${s.toolCall?.toolName}): ${s.toolCall?.output}`)
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

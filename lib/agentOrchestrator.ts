// KiteDesk | multi-step goal agent — real API execution with budget constraints
import Groq from 'groq-sdk'
import { HttpError } from '@/lib/httpError'
import { getTotalCost, TOOL_REGISTRY } from '@/lib/tools'
import type { AgentStep, GoalResult, ToolName } from '@/types'

const DEFAULT_MODEL = 'openai/gpt-oss-120b'

const PLANNER_SYSTEM_PROMPT = `You are an autonomous economic agent with access to real external APIs.
Your job: achieve the user's goal with minimum cost while staying within budget.

Available tools (you pay per call from the user's budget):
- web_search: $0.05 — live web search via Tavily, returns real results
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
    const cost = TOOL_REGISTRY[toolName].costUsdt
    if (accumulated + cost > budgetUsdt) {
      steps.push({
        stepNumber: steps.length + 1,
        description: 'Stopped: budget reached before running this tool',
        reasoning: `Need ${cost} USDT but only ${(budgetUsdt - accumulated).toFixed(4)} USDT left.`,
        completedAt: Date.now(),
      })
      skippedTools.push(toolName)
      for (const rest of bodyPlan.slice(i + 1)) {
        skippedTools.push(rest.toolName)
      }
      break
    }
    const toolInput = buildContextualInput(row, steps)
    const started = Date.now()
    const output = await TOOL_REGISTRY[toolName].execute(toolInput)
    const durationMs = Date.now() - started
    accumulated += cost
    steps.push({
      stepNumber: steps.length + 1,
      description: TOOL_REGISTRY[toolName].description,
      reasoning: row.reasoning,
      completedAt: Date.now(),
      toolCall: {
        toolName,
        input: toolInput,
        output,
        costUsdt: cost,
        durationMs,
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
      },
    })
  } else {
    finalOutput =
      researchCollected || 'Budget exhausted before final synthesis could run.'
  }

  const uniqueSkipped = Array.from(new Set(skippedTools))
  const completedAt = Date.now()
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
  }
}

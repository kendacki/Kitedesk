// KiteDesk | multi-step goal-based agent orchestrator
import Groq from 'groq-sdk'
import { HttpError } from '@/lib/httpError'
import { getTotalCost, TOOL_REGISTRY } from '@/lib/tools'
import type { AgentStep, GoalResult, ToolName } from '@/types'

const DEFAULT_MODEL = 'openai/gpt-oss-120b'

const PLANNER_SYSTEM = `You are an autonomous agent planner. Given a user goal and budget in USDT, decide which tools to use and in what order. Return ONLY valid JSON: { plan: [{stepNumber, toolName, inputPrompt, reasoning}], estimatedCost: number }. Available tools and costs: web_search($0.05), price_check($0.05), competitor_analysis($0.08), news_fetch($0.04), summarize($0.02). Always end with summarize. Never exceed the budget. Use minimum tools needed.`

type PlanRow = {
  stepNumber: number
  toolName: string
  inputPrompt: string
  reasoning: string
}

type PlannerJson = {
  plan?: PlanRow[]
  estimatedCost?: number
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

async function runPlanner(goal: string, budgetUsdt: number): Promise<PlanRow[]> {
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
      { role: 'system', content: PLANNER_SYSTEM },
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
      stepNumber: typeof row.stepNumber === 'number' ? row.stepNumber : valid.length + 1,
      toolName: row.toolName,
      inputPrompt: row.inputPrompt,
      reasoning: row.reasoning,
    })
  }
  if (valid.length === 0) {
    throw new HttpError('Planner produced an empty plan', 502)
  }
  const body = valid.filter((r) => r.toolName !== 'summarize')
  const synthCost = TOOL_REGISTRY.summarize.costUsdt
  if (synthCost > budgetUsdt) {
    throw new HttpError('Budget too small for minimum execution', 400)
  }
  let trimmed = [...body]
  while (
    trimmed.length > 0 &&
    planCostForTools(trimmed.map((r) => r.toolName as ToolName)) + synthCost > budgetUsdt
  ) {
    trimmed = trimmed.slice(0, -1)
  }
  return trimmed
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

  const bodyPlan = await runPlanner(g, budgetUsdt)
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
      break
    }
    const started = Date.now()
    const output = await TOOL_REGISTRY[toolName].execute(row.inputPrompt)
    const durationMs = Date.now() - started
    accumulated += cost
    steps.push({
      stepNumber: steps.length + 1,
      description: TOOL_REGISTRY[toolName].description,
      reasoning: row.reasoning,
      completedAt: Date.now(),
      toolCall: {
        toolName,
        input: row.inputPrompt,
        output,
        costUsdt: cost,
        durationMs,
      },
    })
  }

  const contextParts = steps
    .map((s) => s.toolCall?.output)
    .filter((o): o is string => typeof o === 'string' && o.length > 0)
  const synthesisInput =
    contextParts.length > 0
      ? `User goal:\n${g}\n\n--- Tool outputs ---\n${contextParts.join('\n\n---\n\n')}`
      : `User goal:\n${g}\n\nNo intermediate tool outputs; provide a concise plan and recommendation.`

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
      contextParts.join('\n\n---\n\n') ||
      'Budget exhausted before final synthesis could run.'
  }

  const completedAt = Date.now()
  return {
    goal: g,
    budgetUsdt,
    steps,
    totalSpentUsdt: accumulated,
    remainingBudget: Math.max(0, budgetUsdt - accumulated),
    finalOutput,
    completedAt,
  }
}

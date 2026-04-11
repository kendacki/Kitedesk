// KiteDesk | tool registry with costs and executors
import Groq from 'groq-sdk'
import { HttpError } from '@/lib/httpError'
import type { ToolName } from '@/types'

const DEFAULT_MODEL = 'openai/gpt-oss-120b'

export type Tool = {
  name: ToolName
  description: string
  costUsdt: number
  execute: (input: string) => Promise<string>
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

async function callGroq(systemPrompt: string, userInput: string): Promise<string> {
  const trimmed = userInput.trim()
  if (!trimmed) {
    throw new HttpError('Tool input cannot be empty', 400)
  }
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new HttpError('GROQ_API_KEY is not configured', 503)
  }
  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL
  const client = new Groq({ apiKey })
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: trimmed },
    ],
  })
  const raw = completion.choices[0]?.message?.content
  const text = normalizeMessageContent(raw).trim()
  if (!text) {
    throw new HttpError('Tool returned no text output', 502)
  }
  return text
}

export const TOOL_REGISTRY: Record<ToolName, Tool> = {
  web_search: {
    name: 'web_search',
    description: 'Simulated web search returning structured results',
    costUsdt: 0.05,
    execute: (input) =>
      callGroq(
        'You are a web search engine. Given a query, return 5 realistic and factual search results in JSON format: [{title, url, snippet}]. Be accurate.',
        input
      ),
  },
  price_check: {
    name: 'price_check',
    description: 'Product pricing from multiple retailers (simulated)',
    costUsdt: 0.05,
    execute: (input) =>
      callGroq(
        'You are a product pricing database. Given a product query, return current realistic market prices from 3 retailers in JSON: [{retailer, price, url, inStock}].',
        input
      ),
  },
  competitor_analysis: {
    name: 'competitor_analysis',
    description: 'Competitor analysis with pros and cons',
    costUsdt: 0.08,
    execute: (input) =>
      callGroq(
        'You are a market research analyst. Given a product or company, return a structured competitor analysis with pros/cons for 3 competitors.',
        input
      ),
  },
  news_fetch: {
    name: 'news_fetch',
    description: 'Recent news items for a topic (simulated)',
    costUsdt: 0.04,
    execute: (input) =>
      callGroq(
        'You are a news aggregator. Given a topic, return 4 recent relevant news items in JSON: [{headline, source, summary, date}].',
        input
      ),
  },
  summarize: {
    name: 'summarize',
    description: 'Synthesize research into a recommendation',
    costUsdt: 0.02,
    execute: (input) =>
      callGroq(
        'You are an expert analyst. Synthesize the provided research into a clear, actionable recommendation with a final verdict.',
        input
      ),
  },
}

export function getTotalCost(tools: ToolName[]): number {
  return tools.reduce((sum, name) => sum + TOOL_REGISTRY[name].costUsdt, 0)
}

export function getToolByName(name: ToolName): Tool {
  return TOOL_REGISTRY[name]
}

// KiteDesk | agent tool registry — real API calls per execution
import { tavily } from '@tavily/core'
import { HttpError } from '@/lib/httpError'
import type { ToolName } from '@/types'

export interface Tool {
  name: ToolName
  description: string
  costUsdt: number
  execute: (input: string) => Promise<string>
}

function mapToolError(tool: string, e: unknown): never {
  if (e instanceof HttpError) throw e
  const msg = e instanceof Error ? e.message : String(e)
  console.error(`[tool ${tool}]`, e)
  throw new HttpError(`${tool} failed: ${msg}`, 502)
}

export const TOOL_REGISTRY: Record<ToolName, Tool> = {
  web_search: {
    name: 'web_search',
    description: 'Search the live web for any query',
    costUsdt: 0.05,
    execute: async (input) => {
      try {
        const client = tavily({ apiKey: process.env.TAVILY_API_KEY! })
        const response = await client.search(input, {
          searchDepth: 'basic',
          maxResults: 5,
          includeAnswer: true,
        })
        return JSON.stringify({
          answer: response.answer,
          results: response.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content.slice(0, 300),
            score: r.score,
          })),
        })
      } catch (e) {
        mapToolError('web_search', e)
      }
    },
  },
  news_fetch: {
    name: 'news_fetch',
    description: 'Fetch recent news articles on a topic',
    costUsdt: 0.04,
    execute: async (input) => {
      try {
        const client = tavily({ apiKey: process.env.TAVILY_API_KEY! })
        const response = await client.search(input, {
          searchDepth: 'basic',
          topic: 'news',
          maxResults: 5,
          includeAnswer: true,
          days: 7,
        })
        return JSON.stringify({
          answer: response.answer,
          articles: response.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content.slice(0, 250),
            publishedDate: r.publishedDate,
          })),
        })
      } catch (e) {
        mapToolError('news_fetch', e)
      }
    },
  },
  price_check: {
    name: 'price_check',
    description: 'Search for current prices and buying options',
    costUsdt: 0.05,
    execute: async (input) => {
      try {
        const client = tavily({ apiKey: process.env.TAVILY_API_KEY! })
        const response = await client.search(`${input} price buy 2025`, {
          searchDepth: 'advanced',
          maxResults: 6,
          includeAnswer: true,
        })
        return JSON.stringify({
          answer: response.answer,
          sources: response.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content.slice(0, 300),
          })),
        })
      } catch (e) {
        mapToolError('price_check', e)
      }
    },
  },
  competitor_analysis: {
    name: 'competitor_analysis',
    description: 'Research competitors and alternatives',
    costUsdt: 0.08,
    execute: async (input) => {
      try {
        const client = tavily({ apiKey: process.env.TAVILY_API_KEY! })
        const response = await client.search(
          `${input} alternatives competitors comparison`,
          {
            searchDepth: 'advanced',
            maxResults: 6,
            includeAnswer: true,
          }
        )
        return JSON.stringify({
          answer: response.answer,
          sources: response.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content.slice(0, 300),
          })),
        })
      } catch (e) {
        mapToolError('competitor_analysis', e)
      }
    },
  },
  deep_read: {
    name: 'deep_read',
    description: 'Read full content of a specific URL',
    costUsdt: 0.06,
    execute: async (input) => {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          },
          body: JSON.stringify({
            url: input.startsWith('http') ? input : `https://${input}`,
            formats: ['markdown'],
          }),
        })
        const data = (await res.json()) as {
          success: boolean
          data?: { markdown?: string }
        }
        if (!data.success || !data.data?.markdown) {
          throw new HttpError('Firecrawl failed to read URL', 502)
        }
        return data.data.markdown.slice(0, 1500)
      } catch (e) {
        mapToolError('deep_read', e)
      }
    },
  },
  summarize: {
    name: 'summarize',
    description: 'Synthesize all research into a final recommendation',
    costUsdt: 0.02,
    execute: async (input) => {
      try {
        const Groq = (await import('groq-sdk')).default
        const client = new Groq({ apiKey: process.env.GROQ_API_KEY! })
        const completion = await client.chat.completions.create({
          model: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b',
          max_tokens: 1024,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert analyst. Synthesize the provided research context into a clear, structured recommendation with: 1) Key findings, 2) Final verdict, 3) Actionable next steps. Be specific and cite sources where possible.',
            },
            { role: 'user', content: input },
          ],
        })
        return completion.choices[0]?.message?.content ?? 'No summary generated'
      } catch (e) {
        mapToolError('summarize', e)
      }
    },
  },
}

export function getTotalCost(tools: ToolName[]): number {
  return tools.reduce((sum, name) => sum + TOOL_REGISTRY[name].costUsdt, 0)
}

export function getToolByName(name: ToolName): Tool {
  return TOOL_REGISTRY[name]
}

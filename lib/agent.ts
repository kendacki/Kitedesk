// KiteDesk | server-side LLM task execution via Groq (OpenAI-compatible chat)
import Groq from 'groq-sdk'
import { HttpError } from '@/lib/httpError'
import { TaskType } from '@/types'

const DEFAULT_MODEL = 'openai/gpt-oss-120b'

const SYSTEM_PROMPTS: Record<TaskType, string> = {
  research: `You are a world-class research analyst. Given a topic or question, produce a structured research summary with:
1. Key findings (3-5 bullet points)
2. Important context and background
3. Recent developments or trends
4. Actionable insights
Be concise, factual, and useful. Format with clear headers.`,

  code_review: `You are a senior software engineer specializing in security and code quality. Given code, provide:
1. Security vulnerabilities (if any) — ranked by severity
2. Code quality issues (naming, structure, complexity)
3. Performance concerns
4. Specific recommended fixes with code examples
Be direct and actionable.`,

  content_gen: `You are an expert content strategist for Web3 and tech builders. Given a topic or brief:
1. Generate 3 tweet variations (under 280 chars each)
2. One LinkedIn post (3-5 sentences, professional but energetic)
3. One blog post outline (title + 5 section headers with 1-line descriptions)
Match the tone of the Web3/tech builder audience.`,
}

function normalizeMessageContent(content: unknown): string {
  if (content === null || content === undefined) {
    return ''
  }
  if (typeof content === 'string') {
    return content
  }
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

export async function executeAgentTask(
  taskType: TaskType,
  prompt: string
): Promise<string> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    throw new HttpError('Prompt cannot be empty', 400)
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
      { role: 'system', content: SYSTEM_PROMPTS[taskType] },
      { role: 'user', content: trimmed },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  const text = normalizeMessageContent(raw).trim()
  if (!text) {
    throw new HttpError('Agent returned no text output', 502)
  }

  return text
}

// KiteDesk | agent goal and tool types

export type TaskType = 'research' | 'code_review' | 'content_gen' | 'goal'

export interface Task {
  id: string
  type: TaskType
  prompt: string
  userAddress: string
  pricingUsdt: number
  status: 'pending' | 'paid' | 'running' | 'completed' | 'failed'
  createdAt: number
}

export interface TaskResult {
  taskId: string
  output: string
  txHash: string
  attestationHash: string
  attestationUrl: string
  completedAt: number
}

export interface AttestationRecord {
  taskId: string
  resultHash: string
  userAddress: string
  timestamp: number
  txHash: string
}

export interface TaskHistoryEntry {
  taskId: string
  taskType: TaskType
  promptPreview: string
  attestationUrl: string
  completedAt: number
}

export type ToolName =
  | 'web_search'
  | 'price_check'
  | 'competitor_analysis'
  | 'summarize'
  | 'news_fetch'

export interface ToolCall {
  toolName: ToolName
  input: string
  output: string
  costUsdt: number
  durationMs: number
}

export interface AgentStep {
  stepNumber: number
  description: string
  toolCall?: ToolCall
  reasoning: string
  completedAt: number
}

export interface GoalResult {
  taskId: string
  goal: string
  budgetUsdt: number
  steps: AgentStep[]
  totalSpentUsdt: number
  remainingBudget: number
  finalOutput: string
  txHash: string
  attestationHash: string
  attestationUrl: string
  completedAt: number
}

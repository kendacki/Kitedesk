// KiteDesk | shared TypeScript types for tasks and attestations

export type TaskType = 'research' | 'code_review' | 'content_gen'

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

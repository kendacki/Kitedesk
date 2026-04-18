// KiteDesk | centralized goal-agent demo / trace header copy (desk UI)

/** Example goal string used in placeholders and docs */
export const GOAL_AGENT_EXAMPLE_GOAL = 'Find the best GPU under $500'

/** What the autonomous agent does — shown under the “Agent” heading in the trace panel */
export const GOAL_AGENT_CAPABILITY_LINES = [
  'searches APIs and data sources',
  'evaluates cost per call',
  'pays via x402',
  'retrieves specs and evidence',
  'stays within budget',
] as const

export const GOAL_AGENT_SECTION_LABELS = {
  goal: 'Goal',
  agent: 'Agent',
  totalSpent: 'Total spent',
  saved: 'Saved',
} as const

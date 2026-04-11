// KiteDesk | local test for goal agent execution
// Run from repo root: npx tsx scripts/test-goal-agent.ts
// Or: node scripts/test-goal-agent.cjs
import { config } from 'dotenv'
import path from 'path'
import { executeGoal } from '../lib/agentOrchestrator'

config({ path: path.resolve(process.cwd(), '.env.local') })
config()

async function main() {
  const cases: { goal: string; budget: number }[] = [
    { goal: 'Find the best budget mechanical keyboard under $100', budget: 0.4 },
    { goal: 'What are the latest developments in AI agent payments', budget: 0.25 },
  ]

  for (const { goal, budget } of cases) {
    console.log('\n========== GOAL ==========')
    console.log(goal)
    console.log('Budget USDT:', budget)

    const result = await executeGoal(goal, budget)

    console.log('\n--- Plan reasoning ---')
    console.log(result.planReasoning ?? '(none)')

    console.log('\n--- Steps ---')
    for (const s of result.steps) {
      const tc = s.toolCall
      if (tc) {
        const preview = tc.output.slice(0, 100).replace(/\s+/g, ' ')
        console.log(
          `  step ${s.stepNumber} | ${tc.toolName} | ${tc.costUsdt} USDT | ${preview}${tc.output.length > 100 ? '…' : ''}`
        )
      } else {
        console.log(`  step ${s.stepNumber} | (no tool) | ${s.reasoning}`)
      }
    }

    console.log('\n--- Totals ---')
    console.log('Total spent USDT:', result.totalSpentUsdt)
    console.log('Skipped tools:', result.skippedTools?.join(', ') || '(none)')
    console.log('\n--- Final output (first 200 chars) ---')
    console.log(
      result.finalOutput.slice(0, 200).replace(/\s+/g, ' ') +
        (result.finalOutput.length > 200 ? '…' : '')
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

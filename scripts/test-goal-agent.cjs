// KiteDesk | local test for goal agent execution (run with: node scripts/test-goal-agent.cjs)
//
// npx ts-node --project tsconfig.json scripts/test-goal-agent.cjs
//   (needs ts-node + a tsconfig that includes scripts and path aliases; this repo uses tsx below.)
// npx tsc --noEmit && node scripts/test-goal-agent.cjs
//   (won’t run as-is: TypeScript is not emitted to dist; use node scripts/test-goal-agent.cjs.)

const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config()

const { register, require: tsxRequire } = require('tsx/cjs/api')
register()

/** Dynamic-style load: tsx resolves @/ imports in lib/agentOrchestrator.ts */
async function loadOrchestrator() {
  const orchestratorPath = path.join(__dirname, '..', 'lib', 'agentOrchestrator.ts')
  return tsxRequire(orchestratorPath, __filename)
}

async function main() {
  const { executeGoal } = await loadOrchestrator()

  const cases = [
    { goal: 'Find the best budget mechanical keyboard under $100', budget: 0.4 },
    { goal: 'What are the latest developments in AI agent payments', budget: 0.25 },
  ]

  for (const { goal, budget } of cases) {
    console.log('\n========== GOAL ==========')
    console.log('Goal:', goal)
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
          `  stepNumber=${s.stepNumber} toolName=${tc.toolName} costUsdt=${tc.costUsdt} outputPreview="${preview}${tc.output.length > 100 ? '…' : ''}"`
        )
      } else {
        console.log(
          `  stepNumber=${s.stepNumber} toolName=(none) reasoning="${s.reasoning}"`
        )
      }
    }

    console.log('\n--- Total spent ---')
    console.log(result.totalSpentUsdt)

    console.log('\n--- Skipped tools ---')
    console.log(result.skippedTools?.length ? result.skippedTools.join(', ') : '(none)')

    console.log('\n--- Final output (first 200 chars) ---')
    const fo = result.finalOutput
    console.log(fo.slice(0, 200).replace(/\s+/g, ' ') + (fo.length > 200 ? '…' : ''))
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

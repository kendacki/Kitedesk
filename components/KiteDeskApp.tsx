// KiteDesk | app shell wiring goal agent + step streaming
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { useTaskExecution } from '@/hooks/useTaskExecution'
import { WalletConnect } from '@/components/WalletConnect'
import { TaskForm } from '@/components/TaskForm'
import { AgentStepsPanel } from '@/components/AgentStepsPanel'
import { LoadingAgent } from '@/components/LoadingAgent'
import { ResultPanel } from '@/components/ResultPanel'
import { TaskHistory } from '@/components/TaskHistory'
import { KitedeskLogoMark } from '@/components/landing/KitedeskLogoMark'
import { brandEase, brandSecondaryButtonLight } from '@/lib/brand'
import type { ClassicTaskType } from '@/hooks/useTaskExecution'

const blockShow = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: brandEase },
  },
}

function spentFromSteps(
  stepList: { toolCall?: { costUsdt?: number } | undefined }[]
): number {
  return stepList.reduce((sum, s) => sum + (s.toolCall?.costUsdt ?? 0), 0)
}

export function KiteDeskApp() {
  const wallet = useWallet()
  const task = useTaskExecution()
  const [historyTick, setHistoryTick] = useState(0)
  const [lastGoalBudgetUsdt, setLastGoalBudgetUsdt] = useState<number | null>(null)

  useEffect(() => {
    if (task.status === 'done') {
      setHistoryTick((t) => t + 1)
    }
  }, [task.status])

  const busy = ['paying', 'planning', 'executing', 'attesting'].includes(task.status)
  const showResult = task.result && task.status === 'done'
  const showGoalResult = task.goalResult && task.status === 'done'

  const showGoalLive =
    task.isGoalFlow && (task.status === 'planning' || task.status === 'executing')

  const showGoalAttesting =
    task.isGoalFlow && task.status === 'attesting' && task.steps.length > 0

  const liveBudget = task.goalBudgetUsdt ?? 0
  const liveSpent = useMemo(() => spentFromSteps(task.steps), [task.steps])

  const handleRun = (taskType: ClassicTaskType, prompt: string) => {
    if (!wallet.signer || !wallet.address) return
    void task.execute(wallet.signer, wallet.address, taskType, prompt)
  }

  const handleRunGoal = (goal: string, budgetUsdt: number) => {
    if (!wallet.signer || !wallet.address) return
    setLastGoalBudgetUsdt(budgetUsdt)
    void task.executeGoal(wallet.signer, wallet.address, goal, budgetUsdt)
  }

  const panelGoalBudget =
    lastGoalBudgetUsdt ?? task.goalResult?.budgetUsdt ?? task.goalBudgetUsdt ?? 0

  const hideTaskForm = showResult || showGoalResult || showGoalLive || showGoalAttesting

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 safe-x sm:px-6 sm:py-12 md:py-16">
      <motion.header
        initial="hidden"
        animate="show"
        variants={blockShow}
        className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 sm:mb-10 sm:gap-6 sm:pb-8 md:mb-12"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 font-sans text-sm text-emerald-800 transition hover:text-emerald-700"
          >
            <span aria-hidden className="text-lg">
              ←
            </span>
            Back to landing
          </Link>
          <div className="w-full sm:flex sm:w-auto sm:shrink-0 sm:justify-end">
            <WalletConnect
              address={wallet.address}
              provider={wallet.provider}
              connect={wallet.connect}
              disconnect={wallet.disconnect}
              isConnecting={wallet.isConnecting}
              error={wallet.error}
            />
          </div>
        </div>

        <div className="w-full">
          <div className="flex items-start gap-3">
            <KitedeskLogoMark size={44} className="mt-0.5" />
            <div>
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                Kite AI Testnet
              </p>
              <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                KiteDesk
              </h1>
            </div>
          </div>
          <p className="mt-8 max-w-2xl font-sans text-sm leading-relaxed text-slate-600 sm:mt-10 sm:text-base md:mt-12">
            Pay-per-task autonomous AI: connect a wallet, pay USDT on Kite, run
            research, code review, or content tasks with on-chain attestation.
          </p>
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: brandEase, delay: 0.06 }}
        className="flex flex-1 flex-col"
      >
        {!wallet.address ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center font-sans text-sm text-slate-600 shadow-sm sm:p-8">
            Connect your wallet to select a task and pay in USDT.
          </div>
        ) : (
          <>
            {!hideTaskForm && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/60 md:p-8">
                <TaskForm
                  canSubmit={!!wallet.signer && !!wallet.address}
                  busy={busy}
                  onRun={handleRun}
                  onRunGoal={handleRunGoal}
                />
              </div>
            )}

            {showGoalLive ? (
              <div className="mt-2">
                <AgentStepsPanel
                  steps={task.steps}
                  totalSpentUsdt={liveSpent}
                  budgetUsdt={panelGoalBudget || liveBudget}
                  isRunning
                  budgetSavings={(panelGoalBudget || liveBudget) - liveSpent}
                />
              </div>
            ) : null}

            {showGoalAttesting ? (
              <div className="mt-2">
                <AgentStepsPanel
                  steps={task.steps}
                  totalSpentUsdt={liveSpent}
                  budgetUsdt={panelGoalBudget || liveBudget}
                  isRunning={false}
                  budgetSavings={(panelGoalBudget || liveBudget) - liveSpent}
                />
              </div>
            ) : null}

            <LoadingAgent status={task.status} goalMode={task.isGoalFlow} />

            {task.status === 'error' && task.error ? (
              <div
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-800"
                role="alert"
              >
                {task.error}
              </div>
            ) : null}

            {showResult && task.result ? (
              <ResultPanel
                result={task.result}
                onReset={() => {
                  task.reset()
                }}
              />
            ) : null}

            {showGoalResult && task.goalResult ? (
              <div className="mt-2">
                <AgentStepsPanel
                  steps={task.goalResult.steps}
                  totalSpentUsdt={task.goalResult.totalSpentUsdt}
                  budgetUsdt={lastGoalBudgetUsdt ?? task.goalResult.budgetUsdt}
                  isRunning={false}
                  finalOutput={task.goalResult.finalOutput}
                  attestationUrl={task.goalResult.attestationUrl}
                  planReasoning={task.goalResult.planReasoning}
                  skippedTools={task.goalResult.skippedTools}
                  budgetSavings={
                    (lastGoalBudgetUsdt ?? task.goalResult.budgetUsdt) -
                    task.goalResult.totalSpentUsdt
                  }
                />
                <motion.button
                  type="button"
                  onClick={() => {
                    setLastGoalBudgetUsdt(null)
                    task.reset()
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${brandSecondaryButtonLight} mt-6`}
                >
                  Run another task
                </motion.button>
              </div>
            ) : null}

            <TaskHistory userAddress={wallet.address} refreshSignal={historyTick} />
          </>
        )}
      </motion.main>
    </div>
  )
}

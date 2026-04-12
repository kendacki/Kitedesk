// KiteDesk | app shell wiring goal agent + step streaming
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { useTaskExecution } from '@/hooks/useTaskExecution'
import { WalletConnect } from '@/components/WalletConnect'
import { TaskForm } from '@/components/TaskForm'
import { AgentStepsPanel } from '@/components/AgentStepsPanel'
import { AgentExecutionTimeline } from '@/components/AgentExecutionTimeline'
import { ResultPanel } from '@/components/ResultPanel'
import { TaskHistory } from '@/components/TaskHistory'
import { KitedeskLogoMark } from '@/components/landing/KitedeskLogoMark'
import { brandEase, brandSecondaryButtonLight } from '@/lib/brand'
import { KITE_STAY_ON_TESTNET_MESSAGE, TASK_CONFIG } from '@/lib/constants'
import type { ClassicTaskType } from '@/hooks/useTaskExecution'
import { appendLocalTaskHistory } from '@/lib/taskHistoryLocal'

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
  return stepList.reduce((sum, s) => {
    const c = s.toolCall?.costUsdt
    const add = typeof c === 'number' && Number.isFinite(c) ? c : 0
    return sum + add
  }, 0)
}

function safeBudgetSavings(budget: number, spent: number): number {
  const b = Number.isFinite(budget) ? budget : 0
  const s = Number.isFinite(spent) ? spent : 0
  const d = b - s
  return Number.isFinite(d) ? d : 0
}

function x402StatsFromSteps(
  stepList: {
    toolCall?: { costUsdt?: number; paymentStatus?: string } | undefined
  }[]
): { x402PaymentsCount: number; x402TotalPaidUsdt: number } {
  let x402PaymentsCount = 0
  let x402TotalPaidUsdt = 0
  for (const s of stepList) {
    if (s.toolCall?.paymentStatus !== 'paid_via_x402') continue
    x402PaymentsCount += 1
    const c = s.toolCall.costUsdt
    if (typeof c === 'number' && Number.isFinite(c)) {
      x402TotalPaidUsdt += c
    }
  }
  return { x402PaymentsCount, x402TotalPaidUsdt }
}

export function KiteDeskApp() {
  const wallet = useWallet()
  const task = useTaskExecution()
  const [historyTick, setHistoryTick] = useState(0)
  const [lastGoalBudgetUsdt, setLastGoalBudgetUsdt] = useState<number | null>(null)
  const [classicMeta, setClassicMeta] = useState<{
    taskLabel: string
    priceUsdt: number
  } | null>(null)
  const pendingClassicRef = useRef<{
    taskType: ClassicTaskType
    prompt: string
  } | null>(null)
  const lastPersistedTaskIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (task.status === 'done') {
      setHistoryTick((t) => t + 1)
    }
  }, [task.status])

  useEffect(() => {
    if (task.status === 'idle') {
      lastPersistedTaskIdRef.current = null
    }
  }, [task.status])

  useEffect(() => {
    if (task.status !== 'done' || !wallet.address) return
    const id = task.goalResult?.taskId ?? task.result?.taskId
    if (!id || lastPersistedTaskIdRef.current === id) return
    lastPersistedTaskIdRef.current = id

    if (task.goalResult) {
      const g = task.goalResult.goal.trim()
      appendLocalTaskHistory(wallet.address, {
        taskId: task.goalResult.taskId,
        taskType: 'goal',
        promptPreview: g.length > 120 ? `${g.slice(0, 119)}…` : g,
        attestationUrl: task.goalResult.attestationUrl,
        completedAt: task.goalResult.completedAt,
      })
      return
    }

    if (task.result) {
      const p = pendingClassicRef.current
      pendingClassicRef.current = null
      const preview = (p?.prompt ?? task.result.output).trim()
      appendLocalTaskHistory(wallet.address, {
        taskId: task.result.taskId,
        taskType: p?.taskType ?? 'research',
        promptPreview: preview.length > 120 ? `${preview.slice(0, 119)}…` : preview,
        attestationUrl: task.result.attestationUrl,
        completedAt: task.result.completedAt,
      })
    }
  }, [task.status, task.goalResult, task.result, wallet.address])

  const busy = ['paying', 'planning', 'executing', 'attesting'].includes(task.status)
  const showResult = task.result && task.status === 'done'
  const showGoalResult = task.goalResult && task.status === 'done'

  const liveX402 = useMemo(() => x402StatsFromSteps(task.steps), [task.steps])

  const showGoalLive =
    task.isGoalFlow && (task.status === 'planning' || task.status === 'executing')

  const showGoalAttesting =
    task.isGoalFlow && task.status === 'attesting' && task.steps.length > 0

  const liveBudget = task.goalBudgetUsdt ?? 0
  const liveSpent = useMemo(() => spentFromSteps(task.steps), [task.steps])

  const handleRun = (taskType: ClassicTaskType, prompt: string) => {
    if (!wallet.signer || !wallet.address) return
    const cfg = TASK_CONFIG[taskType]
    setClassicMeta({ taskLabel: cfg.label, priceUsdt: cfg.priceUsdt })
    pendingClassicRef.current = { taskType, prompt: prompt.trim() }
    void task.execute(wallet.signer, wallet.address, taskType, prompt)
  }

  const handleRunGoal = (goal: string, budgetUsdt: number) => {
    if (!wallet.signer || !wallet.address) return
    setClassicMeta(null)
    pendingClassicRef.current = null
    setLastGoalBudgetUsdt(budgetUsdt)
    void task.executeGoal(wallet.signer, wallet.address, goal, budgetUsdt)
  }

  const panelGoalBudget =
    lastGoalBudgetUsdt ?? task.goalResult?.budgetUsdt ?? task.goalBudgetUsdt ?? 0

  const hideTaskForm = showResult || showGoalResult || showGoalLive || showGoalAttesting

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 font-sans safe-x sm:px-6 sm:py-12 md:py-16">
      <a
        href="#kitedesk-main"
        className="fixed left-4 top-0 z-[100] -translate-y-[180%] rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform duration-200 focus:translate-y-4 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        onClick={(e) => {
          const el = document.getElementById('kitedesk-main')
          if (el) {
            e.preventDefault()
            el.focus({ preventScroll: true })
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }}
      >
        Skip to main content
      </a>
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
              switchToKite={wallet.switchToKite}
              wrongNetwork={wallet.wrongNetwork}
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
                KiteDesk · Kite AI Testnet
              </p>
              <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                AI agents that plan, pay, and execute tasks under budget — autonomously
              </h1>
            </div>
          </div>
          <p className="mt-8 max-w-2xl font-sans text-sm leading-relaxed text-slate-600 sm:mt-10 sm:text-base md:mt-12">
            You fund a USDT budget on Kite testnet. The agent chooses tools, pays APIs
            via <span className="font-semibold text-slate-800">x402</span> when a call
            requires it (core execution path), stays inside your cap, and anchors proof
            on-chain — a buyer in a market, not a chat box with a card on file.
          </p>
        </div>
      </motion.header>

      <motion.main
        id="kitedesk-main"
        tabIndex={-1}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: brandEase, delay: 0.06 }}
        className="flex flex-1 flex-col outline-none"
      >
        {!wallet.address ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center font-sans text-sm text-slate-600 shadow-sm sm:p-8">
            Connect your wallet to fund a task budget (USDT on Kite) and run the agent.
          </div>
        ) : wallet.wrongNetwork ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center font-sans text-sm text-amber-950 shadow-sm sm:p-8">
            <p className="font-medium">{KITE_STAY_ON_TESTNET_MESSAGE}</p>
            <p className="mt-2 text-amber-900/90">
              Wrong network — switch to Kite. Use the button in the header or select
              Kite AI Testnet (chain 2368) in MetaMask before paying or launching the
              agent.
            </p>
          </div>
        ) : (
          <>
            {!busy && !showResult && !showGoalResult ? (
              <p className="mb-4 max-w-2xl font-sans text-xs leading-relaxed text-slate-500">
                The execution timeline below activates when you launch a task — you will
                see payments, tool steps, and on-chain proof.
              </p>
            ) : null}
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
                  budgetSavings={safeBudgetSavings(
                    panelGoalBudget || liveBudget,
                    liveSpent
                  )}
                  x402PaymentsCount={liveX402.x402PaymentsCount}
                  x402TotalPaidUsdt={liveX402.x402TotalPaidUsdt}
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
                  budgetSavings={safeBudgetSavings(
                    panelGoalBudget || liveBudget,
                    liveSpent
                  )}
                  x402PaymentsCount={liveX402.x402PaymentsCount}
                  x402TotalPaidUsdt={liveX402.x402TotalPaidUsdt}
                />
              </div>
            ) : null}

            <AgentExecutionTimeline
              status={task.status}
              isGoalFlow={task.isGoalFlow}
              steps={task.steps}
              goalBudgetUsdt={
                task.isGoalFlow ? panelGoalBudget || liveBudget || undefined : undefined
              }
            />

            {task.status === 'error' && task.error ? (
              <div
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-sans text-sm text-red-800"
                role="alert"
              >
                {task.error}
              </div>
            ) : null}

            {showResult && task.result ? (
              <ResultPanel
                result={task.result}
                classicCost={classicMeta ?? undefined}
                onReset={() => {
                  setClassicMeta(null)
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
                  budgetSavings={safeBudgetSavings(
                    lastGoalBudgetUsdt ?? task.goalResult.budgetUsdt,
                    task.goalResult.totalSpentUsdt
                  )}
                  x402PaymentsCount={task.goalResult.x402PaymentsCount}
                  x402TotalPaidUsdt={task.goalResult.x402TotalPaidUsdt}
                />
                <motion.button
                  type="button"
                  onClick={() => {
                    setClassicMeta(null)
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

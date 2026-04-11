// KiteDesk | wallet, task form, loading, results, history (brand-aligned with landing)
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { useTaskExecution } from '@/hooks/useTaskExecution'
import { WalletConnect } from '@/components/WalletConnect'
import { TaskForm } from '@/components/TaskForm'
import { LoadingAgent } from '@/components/LoadingAgent'
import { ResultPanel } from '@/components/ResultPanel'
import { TaskHistory } from '@/components/TaskHistory'
import { KitedeskLogoMark } from '@/components/landing/KitedeskLogoMark'
import { brandEase } from '@/lib/brand'
import type { TaskType } from '@/types'

const blockShow = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: brandEase },
  },
}

export function KiteDeskApp() {
  const wallet = useWallet()
  const task = useTaskExecution()

  const busy = ['paying', 'executing', 'attesting'].includes(task.status)
  const showResult = task.result && task.status === 'done'

  const handleRun = (taskType: TaskType, prompt: string) => {
    if (!wallet.signer || !wallet.address) return
    void task.execute(wallet.signer, wallet.address, taskType, prompt)
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 safe-x sm:px-6 sm:py-12 md:py-16">
      <motion.header
        initial="hidden"
        animate="show"
        variants={blockShow}
        className="mb-8 flex flex-col gap-6 border-b border-white/10 pb-6 sm:mb-10 sm:gap-8 sm:pb-8 md:mb-12 md:flex-row md:items-start md:justify-between"
      >
        <div>
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 font-sans text-sm text-emerald-400/90 transition hover:text-emerald-300"
          >
            <span aria-hidden className="text-lg">
              ←
            </span>
            Back to landing
          </Link>
          <div className="flex items-start gap-3">
            <KitedeskLogoMark size={44} invert className="mt-0.5" />
            <div>
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
                Kite AI Testnet
              </p>
              <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
                KiteDesk
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-slate-400 sm:text-base">
            Pay-per-task autonomous AI: connect a wallet, pay USDT on Kite, run
            research, code review, or content tasks with on-chain attestation.
          </p>
        </div>
        <div className="w-full shrink-0 md:w-auto">
          <WalletConnect
            address={wallet.address}
            provider={wallet.provider}
            connect={wallet.connect}
            disconnect={wallet.disconnect}
            isConnecting={wallet.isConnecting}
            error={wallet.error}
          />
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: brandEase, delay: 0.06 }}
        className="flex flex-1 flex-col"
      >
        {!wallet.address ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center font-sans text-sm text-slate-400 shadow-lg shadow-emerald-950/20 backdrop-blur-sm sm:p-8">
            Connect your wallet to select a task and pay in USDT.
          </div>
        ) : (
          <>
            {!showResult && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-emerald-950/25 backdrop-blur-sm md:p-8">
                <TaskForm
                  canSubmit={!!wallet.signer && !!wallet.address}
                  busy={busy}
                  onRun={handleRun}
                />
              </div>
            )}

            <LoadingAgent status={task.status} />

            {task.status === 'error' && task.error ? (
              <div
                className="mt-6 rounded-xl border border-red-500/40 bg-red-950/30 p-4 font-mono text-sm text-red-300"
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

            <TaskHistory />
          </>
        )}
      </motion.main>
    </div>
  )
}

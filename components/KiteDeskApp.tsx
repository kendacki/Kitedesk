// KiteDesk | wallet, task form, loading, results, history
'use client'

import Link from 'next/link'
import { useWallet } from '@/hooks/useWallet'
import { useTaskExecution } from '@/hooks/useTaskExecution'
import { WalletConnect } from '@/components/WalletConnect'
import { TaskForm } from '@/components/TaskForm'
import { LoadingAgent } from '@/components/LoadingAgent'
import { ResultPanel } from '@/components/ResultPanel'
import { TaskHistory } from '@/components/TaskHistory'
import type { TaskType } from '@/types'

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
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16">
      <header className="mb-12 flex flex-col gap-8 border-b border-kite-border pb-8 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/"
            className="mb-3 inline-block font-mono text-xs text-kite-muted transition hover:text-kite-accent"
          >
            Back to landing
          </Link>
          <p className="font-mono text-xs uppercase tracking-widest text-kite-accent">
            Kite AI Testnet
          </p>
          <h1 className="mt-3 font-mono text-3xl font-semibold text-foreground md:text-4xl">
            KiteDesk
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-kite-muted">
            Pay-per-task autonomous AI: connect a wallet, pay USDT on Kite, run
            research, code review, or content tasks with on-chain attestation.
          </p>
        </div>
        <WalletConnect
          address={wallet.address}
          provider={wallet.provider}
          connect={wallet.connect}
          disconnect={wallet.disconnect}
          isConnecting={wallet.isConnecting}
          error={wallet.error}
        />
      </header>

      <main className="flex flex-1 flex-col">
        {!wallet.address ? (
          <div className="rounded-lg border border-kite-border bg-kite-card p-8 text-center font-mono text-sm text-kite-muted">
            Connect your wallet to select a task and pay in USDT.
          </div>
        ) : (
          <>
            {!showResult && (
              <div className="rounded-lg border border-kite-border bg-kite-card p-6 md:p-8">
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
                className="mt-6 rounded-lg border border-[var(--accent-danger)]/40 bg-kite-bg p-4 font-mono text-sm text-[var(--accent-danger)]"
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
      </main>
    </div>
  )
}

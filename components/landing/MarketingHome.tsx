// KiteDesk | marketing landing (white / deep-green, Poppins, motion)
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { KitedeskLogoMark } from '@/components/landing/KitedeskLogoMark'
import { HeroCtas } from '@/components/landing/HeroCtas'
import { MobileLandingDock } from '@/components/landing/MobileLandingDock'
import { IconGoalBudget, IconAgentApiPay } from '@/components/landing/HeroFeatureIcons'
import {
  brandEase,
  brandPrimaryCtaMarketing,
  brandSecondaryCtaMarketing,
} from '@/lib/brand'
import { GITHUB_REPO_URL, githubLicenseUrl } from '@/lib/publicLinks'
import { LottieHeader } from '@/components/LottieHeader'

const MotionLink = motion.create(Link)

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.45,
      ease: brandEase,
    },
  }),
}

const floatTransition = {
  duration: 5,
  repeat: Infinity,
  ease: [0.45, 0, 0.55, 1] as [number, number, number, number],
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className="text-slate-800"
      aria-hidden
    >
      {open ? (
        <path
          d="M6 6L18 18M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

export function MarketingHome() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-white/95 pb-[calc(4.5rem+env(safe-area-inset-bottom))] font-sans text-slate-900 antialiased backdrop-blur-[2px] md:pb-0">
      <a
        href="#marketing-main"
        className="fixed left-4 top-0 z-[100] -translate-y-[180%] rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform duration-200 focus:translate-y-4 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        onClick={(e) => {
          const el = document.getElementById('marketing-main')
          if (el) {
            e.preventDefault()
            el.focus({ preventScroll: true })
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }}
      >
        Skip to main content
      </a>
      <header className="safe-t sticky top-0 z-50 border-b border-slate-100/80 bg-white/90 backdrop-blur-md">
        <div className="relative mx-auto flex min-h-[3.25rem] max-w-6xl items-center justify-between px-4 py-3 sm:min-h-[3.5rem] sm:px-6 sm:py-4 safe-x">
          <Link
            href="/"
            className="relative z-30 flex min-w-0 shrink-0 items-center gap-2"
          >
            <KitedeskLogoMark size={34} />
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">
              KiteDesk
            </span>
          </Link>
          <nav
            aria-label="Page sections"
            className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 md:flex md:justify-center"
          >
            <ul className="pointer-events-auto flex items-center gap-x-6 text-sm font-normal text-slate-600 lg:gap-x-8">
              <li>
                <a href="#how" className="transition hover:text-emerald-700">
                  How it works
                </a>
              </li>
              <li>
                <a href="#commerce" className="transition hover:text-emerald-700">
                  Commerce
                </a>
              </li>
              <li>
                <a href="#why-kite" className="transition hover:text-emerald-700">
                  Why Kite
                </a>
              </li>
            </ul>
          </nav>
          <div className="relative z-30 flex shrink-0 items-center gap-2 sm:gap-3">
            <MotionLink
              href="/desk"
              className={`${brandSecondaryCtaMarketing} hidden md:inline-flex`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign in
            </MotionLink>
            <MotionLink
              href="/desk"
              className={`${brandPrimaryCtaMarketing} hidden min-h-[44px] sm:inline-flex`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="hidden sm:inline">Open console</span>
              <span className="sm:hidden">Open</span>
            </MotionLink>
            <button
              type="button"
              className="touch-target inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-800 shadow-sm md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            key="mobile-menu"
            id="mobile-nav"
            className="fixed inset-0 z-[60] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-white shadow-2xl safe-x"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                <span className="text-sm font-semibold text-slate-900">Menu</span>
                <button
                  type="button"
                  className="touch-target rounded-lg px-3 text-sm font-medium text-slate-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Close
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-4 text-base font-medium text-slate-700">
                <a
                  href="#product"
                  className="rounded-lg px-3 py-3 active:bg-emerald-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Product
                </a>
                <a
                  href="#how"
                  className="rounded-lg px-3 py-3 active:bg-emerald-50"
                  onClick={() => setMenuOpen(false)}
                >
                  How it works
                </a>
                <a
                  href="#commerce"
                  className="rounded-lg px-3 py-3 active:bg-emerald-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Commerce
                </a>
                <a
                  href="#why-kite"
                  className="rounded-lg px-3 py-3 active:bg-emerald-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Why Kite
                </a>
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main id="marketing-main" tabIndex={-1} className="outline-none">
        <section className="relative overflow-hidden pb-20 pt-4 sm:pb-24 sm:pt-6 md:pb-32 md:pt-10">
          <LottieHeader />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12)_0%,_transparent_55%)]" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 safe-x">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="flex min-w-0 w-full max-w-full flex-col items-stretch gap-5 text-left sm:gap-6 lg:max-w-xl lg:pr-8">
                <motion.h1
                  custom={1}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  className="flex w-full max-w-xl flex-col gap-2.5 text-left text-[clamp(1.35rem,3.6vw+0.35rem,2.5rem)] font-semibold leading-[1.15] tracking-tight text-slate-900 sm:gap-3 sm:text-4xl lg:max-w-none lg:text-[2.65rem]"
                >
                  <span className="block">
                    <span className="text-slate-900">
                      Autonomous agents that plan, fund, and{' '}
                    </span>
                    <span className="bg-gradient-to-br from-emerald-900 to-emerald-500 bg-clip-text text-transparent">
                      execute within budget
                    </span>
                  </span>
                </motion.h1>
                <motion.p
                  custom={2}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  className="w-full max-w-xl text-sm font-normal leading-[1.65] text-slate-600 sm:text-base lg:max-w-none"
                >
                  AI agents execute tasks and pay for APIs autonomously — every step
                  verifiable on-chain.
                </motion.p>
                <motion.div
                  custom={3}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  className="grid w-full max-w-xl grid-cols-1 gap-3 text-sm text-slate-600 xs:grid-cols-2 xs:items-stretch xs:gap-3 sm:gap-4 lg:max-w-none"
                >
                  <span className="flex min-h-[3.25rem] w-full min-w-0 items-center gap-2.5 rounded-full bg-slate-50 px-3 py-2.5 sm:px-4">
                    <IconGoalBudget /> Goal-based execution with budgets
                  </span>
                  <span className="flex min-h-[3.25rem] w-full min-w-0 items-center gap-2.5 rounded-full bg-slate-50 px-3 py-2.5 sm:px-4">
                    <IconAgentApiPay /> Agent-to-API micro-payments (x402)
                  </span>
                </motion.div>
                <motion.div
                  custom={4}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  className="w-full max-w-xl lg:max-w-none [&>div]:!mt-0 [&>div]:w-full [&>div]:max-w-full [&>div]:sm:max-w-full"
                >
                  <HeroCtas />
                </motion.div>
              </div>
              <motion.div
                custom={1}
                initial="hidden"
                animate="show"
                variants={fadeUp}
                className="relative flex w-full justify-center bg-transparent lg:justify-end"
              >
                <Image
                  src="/images/hero-delivery-robot.png"
                  alt="KiteDesk autonomous agent"
                  width={1024}
                  height={682}
                  priority
                  className="h-auto w-[min(100%,24rem)] bg-transparent object-contain drop-shadow-lg sm:w-[min(100%,28rem)] lg:w-[min(100%,32rem)]"
                />
              </motion.div>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={floatTransition}
              className="relative mx-auto mt-10 w-full max-w-3xl sm:mt-12"
            >
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-xl shadow-emerald-900/5 sm:rounded-3xl sm:p-8">
                <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-4 text-left text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-slate-800">Agent console</span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Proof on Kite testnet
                  </span>
                </div>
                <div className="grid gap-3 text-left sm:grid-cols-3 sm:gap-4">
                  {[
                    {
                      label: 'Plan',
                      body: 'The agent breaks your goal into steps and estimates spend against your budget.',
                    },
                    {
                      label: 'Pay APIs',
                      body: 'Tool and data calls settle via x402-style flows on Kite — no manual invoicing.',
                    },
                    {
                      label: 'Prove',
                      body: 'Outputs are committed on-chain so execution is auditable, not hand-waved.',
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-2 h-2 w-8 rounded-full bg-gradient-to-br from-emerald-900 to-emerald-500" />
                      <p className="text-sm font-semibold text-slate-800">
                        {card.label}
                      </p>
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        {card.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section
          id="product"
          className="border-t border-slate-100 bg-slate-50/50 px-4 py-12 sm:px-6 sm:py-16"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Agentic Commerce on Kite
          </p>
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-10 opacity-60 grayscale">
            {['MetaMask', 'Kite', 'Groq', 'USDT', 'Solidity'].map((name) => (
              <span key={name} className="text-sm font-semibold text-slate-400">
                {name}
              </span>
            ))}
          </div>
        </section>

        <section
          className="border-t border-slate-100 bg-white px-4 py-16 sm:px-6 sm:py-24"
          id="how"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl md:text-4xl">
              How agent driven execution works
            </h2>
            <p className="mt-4 font-normal text-slate-600">
              Goal first, then planning, paid APIs, and on chain proof, not a single blind
              &quot;run prompt&quot; button.
            </p>
          </div>
          <ol className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-14 sm:gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Set goal + budget',
                body: 'Define what success means and the USDT envelope the agent may spend.',
              },
              {
                step: '02',
                title: 'Agent plans execution',
                body: 'The agent sequences tools, search, and model calls before spending.',
              },
              {
                step: '03',
                title: 'Agent pays APIs (x402)',
                body: 'Paid endpoints settle on Kite rails so access is machine-native, not ad hoc.',
              },
              {
                step: '04',
                title: 'Result + on-chain proof',
                body: 'Structured output plus attestation hash — auditable end to end.',
              },
            ].map((item) => (
              <li
                key={item.step}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 text-left"
              >
                <span className="text-xs font-semibold text-emerald-700">
                  {item.step}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm font-normal text-slate-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="commerce"
          className="border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl md:text-4xl">
              Agentic Commerce in action
            </h2>
            <p className="mt-4 font-normal text-slate-600">
              A concrete loop: the agent spends real budget on real APIs and reports
              what it used.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm sm:rounded-3xl sm:p-8">
            <p className="text-sm font-semibold text-slate-800">
              Goal: &ldquo;Find the best GPU under $500&rdquo;
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Agent
            </p>
            <ul className="mt-2 space-y-2 text-sm font-normal text-slate-600">
              <li>searches APIs and data sources</li>
              <li>evaluates cost per call</li>
              <li>pays via x402</li>
              <li>retrieves specs and evidence</li>
              <li>stays within budget</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-8 border-t border-slate-100 pt-6 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total spent
                </p>
                <p className="mt-1 font-semibold text-emerald-800">$0.12</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Saved
                </p>
                <p className="mt-1 font-semibold text-slate-800">$0.38</p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="why-kite"
          className="border-t border-slate-100 bg-white px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl md:text-4xl">
              Why Kite chain?
            </h2>
            <p className="mt-4 font-normal text-slate-600">
              Agentic commerce executes on programmable funds and verifiable states, moving
              beyond spreadsheets and human honor codes.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Agents need
              </p>
              <ul className="mt-4 space-y-3 text-sm font-normal text-slate-600">
                <li>programmable money</li>
                <li>enforceable budgets</li>
                <li>verifiable execution</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Kite enables
              </p>
              <ul className="mt-4 space-y-3 text-sm font-normal text-slate-600">
                <li>cost-bound execution</li>
                <li>cryptographic proof</li>
                <li>trustless verification</li>
              </ul>
            </div>
          </div>
        </section>

        <section
          className="border-t border-slate-100 bg-slate-50/50 px-4 py-16 sm:px-6 sm:py-24"
          id="features"
        >
          <div className="mx-auto max-w-6xl">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                Built for autonomous economic agents
              </h2>
              <p className="mt-4 font-normal leading-relaxed text-slate-600">
                KiteDesk is not a gig marketplace. It is an execution surface where
                agents reason about cost, call paid APIs, and finish jobs under rules
                you set — with cryptography backing every step.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:mt-14 sm:gap-6 md:grid-cols-2">
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-500 p-6 text-white shadow-lg shadow-emerald-900/20 sm:rounded-3xl sm:p-8"
            >
              <h3 className="text-xl font-semibold">Verifiable agent spend</h3>
              <p className="mt-3 font-normal leading-relaxed text-white/90">
                Stablecoin flows on Kite testnet show what the agent paid and when.
                Operators and auditors get explorer-grade evidence instead of opaque API
                keys and manual reimbursements.
              </p>
            </motion.div>
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:rounded-3xl sm:p-8"
            >
              <h3 className="text-xl font-semibold text-slate-900">
                Outputs you can anchor
              </h3>
              <p className="mt-3 font-normal leading-relaxed text-slate-600">
                LLM and tool results are hashed into KiteDeskAttestations so the same
                payload cannot be silently swapped later — critical when agents act on
                your behalf.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              What this build is meant to show
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm font-normal leading-relaxed text-slate-600">
              KiteDesk is a working console for agentic commerce: real wallet flows,
              agent-paid APIs via x402 on the execution path, and on-chain attestations
              — not placeholder quotes or simulated checkout.
            </p>
            <div className="mt-10 grid gap-4 sm:gap-6 md:grid-cols-3">
              {[
                {
                  title: 'Autonomous payment path',
                  body: 'When a tool hits HTTP 402, the agent can settle with USDT on Kite testnet and retry with proof — the same pattern paid APIs use on the open web.',
                },
                {
                  title: 'Budget as the guardrail',
                  body: 'You fund a USDT envelope; the agent plans and spends inside it. The desk surfaces spend against that budget so limits are visible, not buried in logs.',
                },
                {
                  title: 'Attestations, not screenshots',
                  body: 'Execution metadata and outputs are anchored on-chain so results are harder to swap after the fact when an autonomous system is the actor.',
                },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
                >
                  <h3 className="text-base font-semibold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm font-normal leading-relaxed text-slate-600">
                    {card.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-500 px-5 py-10 text-center text-white shadow-xl sm:rounded-3xl sm:px-8 sm:py-14"
          >
            <h2 className="text-2xl font-semibold sm:text-3xl md:text-4xl">
              Run an agent with on-chain economics
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-normal text-white/90">
              Set a goal and budget on Kite testnet, let the agent plan and pay APIs,
              then inspect spend and attestations — built for the Agentic Commerce
              track.
            </p>
            <div className="mt-8 flex justify-center">
              <MotionLink
                href="/desk"
                className="inline-flex min-w-[200px] items-center justify-center rounded-md bg-white px-8 py-3 text-sm font-semibold text-emerald-900 shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Open KiteDesk
              </MotionLink>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <KitedeskLogoMark size={32} />
              <span className="font-semibold">KiteDesk</span>
            </div>
            <p className="mt-3 max-w-xs text-sm font-normal text-slate-500">
              Autonomous agents that pay APIs and anchor results on Kite — Agentic
              Commerce, not gig work.
            </p>
            <div className="mt-4 flex gap-4 text-sm text-slate-400">
              <a
                href="https://x.com/GoKiteAI"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-700"
                title="Kite AI on X"
              >
                X
              </a>
              <a
                href="https://www.linkedin.com/company/gokiteai/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-700"
                title="Kite AI on LinkedIn"
              >
                LinkedIn
              </a>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-700"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Product
              </p>
              <ul className="mt-3 space-y-2 text-sm font-normal text-slate-600">
                <li>
                  <a href="#how" className="hover:text-emerald-700">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#commerce" className="hover:text-emerald-700">
                    Agentic Commerce
                  </a>
                </li>
                <li>
                  <a href="#why-kite" className="hover:text-emerald-700">
                    Why Kite
                  </a>
                </li>
                <li>
                  <Link href="/desk" className="hover:text-emerald-700">
                    App
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Network
              </p>
              <ul className="mt-3 space-y-2 text-sm font-normal text-slate-600">
                <li>
                  <a
                    href="https://docs.gokite.ai/"
                    className="hover:text-emerald-700"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Kite docs
                  </a>
                </li>
                <li>
                  <a
                    href="https://testnet.kitescan.ai/"
                    className="hover:text-emerald-700"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explorer
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Legal
              </p>
              <ul className="mt-3 space-y-2 text-sm font-normal text-slate-600">
                <li>
                  <a
                    href={githubLicenseUrl}
                    className="text-slate-400 transition hover:text-emerald-700"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    MIT License
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-center text-xs font-normal text-slate-400">
          &copy; {new Date().getFullYear()} KiteDesk. Built for Kite AI Hackathon.
        </p>
      </footer>

      <MobileLandingDock />
    </div>
  )
}

// KiteDesk | marketing landing (white / deep-green, Poppins, motion)
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { KitedeskLogoMark } from '@/components/landing/KitedeskLogoMark'
import { HeroCtas } from '@/components/landing/HeroCtas'
import { MobileLandingDock } from '@/components/landing/MobileLandingDock'
import {
  IconMilestonePayments,
  IconOnChainAttestation,
} from '@/components/landing/HeroFeatureIcons'
import {
  brandEase,
  brandPrimaryCtaMarketing,
  brandSecondaryCtaMarketing,
} from '@/lib/brand'

const MotionLink = motion(Link)

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
                <a href="#trust" className="transition hover:text-emerald-700">
                  Security
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
                  href="#trust"
                  className="rounded-lg px-3 py-3 active:bg-emerald-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Security
                </a>
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main>
        <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 md:pb-32 md:pt-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12)_0%,_transparent_55%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <motion.div
              custom={0}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="mb-6 inline-flex rounded-full border border-emerald-200/80 bg-emerald-50/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-900"
            >
              On-chain proof for every AI task
            </motion.div>
            <motion.h1
              custom={1}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="text-balance text-[clamp(1.75rem,5vw+0.5rem,3.75rem)] font-semibold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
            >
              Escrow-grade trust for{' '}
              <span className="bg-gradient-to-br from-emerald-900 to-emerald-500 bg-clip-text text-transparent">
                freelance AI work
              </span>
            </motion.h1>
            <motion.p
              custom={2}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-base font-normal leading-relaxed text-slate-600 sm:mt-8 sm:text-lg"
            >
              KiteDesk pairs USDT settlement on Kite testnet with autonomous agents and
              cryptographic attestations—so milestones are verified, payouts are
              predictable, and deliverables leave an immutable audit trail.
            </motion.p>
            <motion.div
              custom={3}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="mt-8 flex flex-col items-stretch justify-center gap-3 text-sm text-slate-600 xs:flex-row xs:flex-wrap xs:items-center xs:justify-center xs:gap-4"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                <IconMilestonePayments /> Milestone-based payments
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                <IconOnChainAttestation /> Attested outputs on-chain
              </span>
            </motion.div>
            <motion.div custom={4} initial="hidden" animate="show" variants={fadeUp}>
              <HeroCtas />
            </motion.div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={floatTransition}
              className="relative mx-auto mt-12 max-w-3xl sm:mt-16"
            >
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-xl shadow-emerald-900/5 sm:rounded-3xl sm:p-8">
                <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-4 text-left text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-slate-800">Task console</span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Kite testnet
                  </span>
                </div>
                <div className="grid gap-3 text-left sm:grid-cols-3 sm:gap-4">
                  {['Research', 'Code review', 'Content'].map((label) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-2 h-2 w-8 rounded-full bg-gradient-to-br from-emerald-900 to-emerald-500" />
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        Pay USDT, run agent, store attestation hash on-chain.
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
            Trusted execution layer for builders
          </p>
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-10 opacity-60 grayscale">
            {['MetaMask', 'Kite', 'Groq', 'USDT', 'Solidity'].map((name) => (
              <span key={name} className="text-sm font-semibold text-slate-400">
                {name}
              </span>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24" id="trust">
          <div className="mx-auto grid max-w-6xl gap-8 sm:gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                Why teams choose KiteDesk
              </h2>
              <p className="mt-4 font-normal leading-relaxed text-slate-600">
                Built for freelancers and squads who need clear scope, verified
                delivery, and payments that only move when work is complete.
              </p>
            </div>
            <p className="text-sm font-normal leading-relaxed text-slate-600">
              Every completed task comes with a secure, permanent receipt. We
              automatically log exactly what was requested and what was delivered
              directly on the Kite network. No guesswork, no changing the story, just
              complete confidence for both sides.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:mt-14 sm:gap-6 md:grid-cols-2">
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-500 p-6 text-white shadow-lg shadow-emerald-900/20 sm:rounded-3xl sm:p-8"
            >
              <h3 className="text-xl font-semibold">Verifiable Proof of Payment</h3>
              <p className="mt-3 font-normal leading-relaxed text-white/90">
                Watch your USDT move securely on the Kite testnet. Every milestone and
                transaction generates an instant Proof giving you, your clients, and
                evaluators cryptographic receipts, not just promises.
              </p>
            </motion.div>
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:rounded-3xl sm:p-8"
            >
              <h3 className="text-xl font-semibold text-slate-900">
                Agents with receipts
              </h3>
              <p className="mt-3 font-normal leading-relaxed text-slate-600">
                Groq-powered tasks return structured output; the attestation contract
                stores a commitment to that output so your workflow stays
                trust-minimized end to end.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-white px-4 py-16 sm:px-6 sm:py-24" id="how">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl md:text-4xl">
              Launch in four streamlined steps
            </h2>
            <p className="mt-4 font-normal text-slate-600">
              From wallet to attestation—no opaque black boxes.
            </p>
          </div>
          <ol className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-14 sm:gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Connect',
                body: 'Add Kite testnet and link the wallet that will pay and sign.',
              },
              {
                step: '02',
                title: 'Pay USDT',
                body: 'Transfer the quoted USDT to the platform wallet for your task.',
              },
              {
                step: '03',
                title: 'Run agent',
                body: 'The agent executes your prompt via Groq and returns the output.',
              },
              {
                step: '04',
                title: 'Attest',
                body: 'A signed transaction writes the result hash to KiteDeskAttestations.',
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

        <section className="border-t border-slate-100 bg-slate-50/60 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-8 sm:gap-10 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-500 p-6 text-white sm:rounded-3xl sm:p-10"
            >
              <p className="text-lg font-semibold leading-relaxed">
                &ldquo;We needed clients to see the same proof we see internally.
                KiteDesk turned our AI deliverables into explorer links we can drop into
                Slack.&rdquo;
              </p>
              <p className="mt-6 text-sm font-normal text-white/85">
                — Web3 delivery lead, pilot cohort
              </p>
            </motion.div>
            <div className="grid gap-4">
              {[
                {
                  name: 'Analyst',
                  role: 'Research ops',
                  quote: 'Milestone pricing in USDT keeps scope and budget aligned.',
                },
                {
                  name: 'Engineer',
                  role: 'Security review',
                  quote:
                    'Having attestation hashes beats screenshots for audit trails.',
                },
              ].map((t) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <p className="text-sm font-normal text-slate-600">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs font-normal text-slate-500">{t.role}</p>
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
              Ready to run your first attested task?
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-normal text-white/90">
              Connect, pay USDT on Kite, and ship AI work with on-chain proof—built for
              the Agentic Commerce track and production-minded teams.
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
              Pay-per-task AI with USDT on Kite and on-chain attestations for
              trust-minimized delivery.
            </p>
            <div className="mt-4 flex gap-4 text-sm text-slate-400">
              <a href="https://twitter.com" className="hover:text-emerald-700">
                X
              </a>
              <a href="https://linkedin.com" className="hover:text-emerald-700">
                LinkedIn
              </a>
              <a
                href="https://github.com/kendacki/Kitedesk"
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
                  <span className="text-slate-400">MIT License</span>
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

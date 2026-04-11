# KiteDesk — Autonomous Agentic Commerce on Kite AI

**One-liner:** KiteDesk deploys an AI agent that autonomously discovers services, encounters HTTP 402 paywalls, decides whether to pay within budget constraints, settles USDT micro-payments via the x402 protocol on Kite testnet (through a facilitator), and attests the complete execution trace on-chain.

## Why This Matters

Agents that can transact are fundamentally different from agents that only generate text. When an agent holds economic constraints and can choose to pay for access, it participates in real markets—not a simulated chat. The x402 cycle—**402 received → cost evaluated against budget → payment authorized → request retried with proof**—is observable agentic commerce: the same pattern HTTP 402 was designed for, now wired to programmatic settlement on-chain. KiteDesk makes that loop concrete for judges: live budget enforcement, real facilitator settlement, and a chain record of what ran and what was paid.

## Live Demo

**Production:** [http://kitedesk.agiwithai.com/](http://kitedesk.agiwithai.com/)

Product console: `/` (marketing) and `/desk` (wallet, tasks, goal agent).

## Critical setup (manual, before judging)

1. **Fund the agent wallet** — The wallet for **`ATTESTATION_SIGNER_PRIVATE_KEY`** needs **testnet KITE** (gas) and **testnet USDT** on the same asset used for x402 (see **`KITE_X402_TOKEN`**). Use [Kite faucet](https://faucet.gokite.ai) for KITE, then obtain USDT via the Kite portal or docs.
2. **Configure x402 env** in `.env.local` (see `.env.example`):
   - **`KITE_X402_TOKEN`** — USDT contract for x402 payment lines in challenges (default matches Kite testnet USDT).
   - **`KITE_FACILITATOR_URL`** — Pieverse facilitator base; the app posts to `{url}/v2/settle` unless you already include `/v2/settle`.
   - **`KITE_X402_DEMO_API`** — Optional reference URL for Kite’s hosted x402 demo resource (e.g. weather); the shipped goal agent pays for **`/api/x402/search`** (Tavily-backed) on your deployment.
3. **Redeploy attestations** after contract changes — `npm run deploy:contracts`, then set **`KITE_ATTESTATION_CONTRACT`** and **`NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT`**.
4. **Verify build** — Run **`npm run build`** and fix any TypeScript errors before Vercel deploy.

**Platform `payTo`:** Set **`NEXT_PUBLIC_PLATFORM_WALLET`** to the address that should receive x402 payments advertised in the 402 challenge (must match your deployment).

On **`/desk`**, the goal-agent trace shows the x402 step chips (402 → evaluate → pay → result), paid settlement links on Kitescan where applicable, budget skip when a call would exceed the envelope, the agentic-commerce banner when x402 settled, and a cost summary line with **x402 payment count** and **USDT paid autonomously**.

## The x402 Flow (What Judges Will See)

1. **Goal and budget** — The user describes an outcome and sets a USDT budget for the run.
2. **402 from the resource** — The agent calls the paid search API and receives **HTTP 402 Payment Required** with payment terms (e.g. amount and `payTo`).
3. **Budget check** — The orchestrator compares the quoted cost to the remaining budget and proceeds or stops autonomously.
4. **Settlement on Kite** — The agent wallet signs an **EIP-3009** USDT authorization; the **Pieverse facilitator** settles to the API provider’s `payTo` address on **Kite AI Testnet**.
5. **Retry with X-Payment** — The agent retries the request with an **X-Payment** header; the API returns real search data.
6. **Synthesis** — Further tools and a final summarization step produce the user-facing answer within budget.
7. **Attestation** — **`attestGoal`** writes an on-chain record that includes **`x402PaymentsCount`** and **total paid via x402 in micro-USDT** (`x402TotalPaidMicro`), alongside the result and steps digests.

## Tech Stack

| Layer        | Choice                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| Frontend     | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion       |
| Chain        | Kite AI Testnet (chain ID **2368**), ethers.js v6, MetaMask            |
| User funding | Testnet USDT; gasless user transfers via Kite relayer (EIP-3009) where configured |
| x402         | HTTP 402 challenges, **X-Payment** payloads, **Pieverse facilitator** settle |
| Agent        | Groq (`groq-sdk`), planner + tool registry, server-side orchestration  |
| Data         | Supabase (Postgres) for payment claim replay protection and history    |
| Contracts    | Solidity 0.8.20, `KiteDeskAttestations` (Hardhat)                        |
| Deploy       | Vercel (recommended)                                                   |

## x402 Integration Details

- **Token (Kite testnet USDT):** Configure with **`KITE_X402_TOKEN`** (defaults to `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63` if unset); confirm on [Kite testnet explorer](https://testnet.kitescan.ai).
- **Facilitator:** **`KITE_FACILITATOR_URL`** (default `https://facilitator.pieverse.io`); settle endpoint is **`/v2/settle`** appended automatically when needed.
- **Chain:** Kite AI Testnet, **chainId 2368** (RPC and explorer URLs in `.env.example`).
- **Agent wallet:** The server-side wallet backed by **`ATTESTATION_SIGNER_PRIVATE_KEY`** (contract owner / attestation signer) funds and signs x402-related USDT authorizations for per-call API payment, within the user’s verified budget envelope.

## Local Setup

1. Clone the repository and open the project root.
2. Copy environment template: `cp .env.example .env.local` and fill all variables (Groq, Tavily/Firecrawl if using those tools, Kite RPC, USDT and attestation contract addresses, platform wallet, relayer and EIP-712 token domain as needed, **`ATTESTATION_SIGNER_PRIVATE_KEY`**, Supabase URL and service role key, **`INTERNAL_API_BASE_URL`** or app URL for the goal agent calling `/api/x402/*`).
3. Install dependencies: `npm install`.
4. Run the Supabase migration `supabase/migrations/001_kitedesk_tasks.sql` in the SQL editor for replay-safe payment claims and history.
5. Start the app: `npm run dev` and open `http://localhost:3000` (use `/desk` for the full console).
6. Optional hardening before ship: `npm run validate`. Compile and deploy attestations: `npm run compile:contracts` and `npm run deploy:contracts`, then paste the contract address into `.env.local`.

## On-Chain Attestation

The **`KiteDeskAttestations`** contract records goal-mode runs with **`attestGoal`**. Besides the user, task id, **keccak256(final output)**, **keccak256(step trace digest)**, **total spend in micro-USDT**, **step count**, and a short **goal preview**, the attestation stores **how many tool steps completed a paid x402 path** (`x402PaymentsCount`) and **the sum of those payments in micro-USDT** (`x402TotalPaidMicro`). Together with the user’s funding transaction on-chain, that gives a compact, verifiable link between budget, autonomous API payment, and committed execution metadata.

## Built By

**Anand Vashishtha** — Kite AI Global Hackathon 2026, **Agentic Commerce** track (Encode Club).

[X / Twitter](https://twitter.com/Anandvashisht15) · [LinkedIn](https://linkedin.com/in/anandvashishtha)

Official Kite docs: [docs.gokite.ai](https://docs.gokite.ai/).

---

## License

MIT.

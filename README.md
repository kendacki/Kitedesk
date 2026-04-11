# KiteDesk — Autonomous Goal Agents with On-Chain Economics

**One-liner:** KiteDesk lets users delegate goals to an AI agent that autonomously plans, pays for tools, executes API calls, and settles everything on Kite chain — with every step cryptographically attested.

---

## The Problem

Most AI demos stop at “type a prompt, get text back.” The agent never holds money, cannot commit to a budget, and cannot prove what it did or spent. Real agentic commerce needs autonomous execution under economic constraints, with evidence that survives beyond a chat log.

---

## What KiteDesk Does

You describe an outcome and a USDT budget on Kite testnet. The system verifies payment, the agent plans which tools to run, executes them in sequence while tracking cost, synthesizes a final answer, and writes an attestation that binds the result and the execution trace to the chain. Classic task modes (research, code review, content generation) still run as fixed-price jobs with the same payment and attestation pattern.

Flow:

```
User goal + budget → Agent plans → Agent pays per tool → Agent executes → Cost breakdown + on-chain proof
```

(“Pays per tool” here means each tool invocation is priced and recorded in the execution trace; the user funds a single budget or fixed price up front, and the backend enforces that the orchestrated work stays within that envelope.)

---

## Why Blockchain

Agents need programmable money and verifiable execution, not a receipt in a database alone. A Kite payment transaction ties the run to a specific wallet and amount; the attestation contract stores hashes of the outcome and the step trace so third parties can check that a claimed run matches what was committed on-chain. That is the difference between marketing “AI plus crypto” and a workflow where economics and proof are part of the product.

---

## Live Demo

**Production:** *[Replace with your Vercel deployment URL for judges.]*

Desk UI: `/desk` after deploy. Marketing site: `/`.

---

## Agentic Commerce Features

- Goal-based execution with budget constraints
- Agent-to-API micro-payments (per tool call, accounted in the orchestration layer)
- Planner estimates and trims steps to fit the budget before execution
- Multi-step orchestration with a live execution trace in the UI
- On-chain attestation of result hash, steps digest, and total spend (goal mode) plus classic task attestations
- Replay protection: each payment transaction hash is claimed in Supabase before the agent runs; verification uses chain receipts and USDT transfer logs

---

## Tech Stack

| Layer     | Choice |
| --------- | ------ |
| Frontend  | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| Chain     | Kite AI Testnet (chain ID 2368), ethers.js v6, MetaMask |
| Payments  | Testnet USDT; gasless authorization path via Kite relayer (EIP-3009 / EIP-712) where configured |
| Agent     | Groq (`groq-sdk`), multi-step orchestrator plus tool registry |
| Storage   | Supabase (Postgres) for payment claims and task history |
| Contracts | Solidity 0.8.20, `KiteDeskAttestations` (Hardhat) |
| Deploy    | Vercel (recommended) |

---

## Local Setup

1. **Clone** the repo and `cd` into the project root.
2. **Environment:** `cp .env.example .env.local` and fill every variable listed there (Groq, Kite RPC, USDT and attestation addresses, platform wallet, relayer and EIP-712 token domain if using gasless flow, attestation signer key, Supabase URL and service role key).
3. **Install:** `npm install`
4. **Migrate:** In the Supabase SQL editor, run `supabase/migrations/001_kitedesk_tasks.sql` to create the `kitedesk_tasks` table used for replay protection and history.
5. **Run:** `npm run dev` and open `http://localhost:3000`. Use `/desk` for the product console.

For a full sanity check before you ship: `npm run validate` (format, lint, chain/backend scripts, build). Deploy the attestation contract with `npm run compile:contracts` and `npm run deploy:contracts` when your toolchain is configured; paste the contract address into `.env.local`.

---

## On-Chain Attestation

The `KiteDeskAttestations` contract supports two paths:

- **`attestTask`** — Used for fixed task types (`research`, `code_review`, `content_gen`). Stores user, task id, result hash, task type, and timestamp.
- **`attestGoal`** — Used for goal mode. Stores user, task id, **result hash** (keccak256 of the final output), **steps hash** (keccak256 of the JSON-serialized step trace), **total spent** in micro-USDT (integer, `totalSpentUsdt × 1e6`), **step count**, a short **goal preview**, and timestamp.

The **steps hash** is a single commitment to the ordered tool trace the server recorded. It does not put full prompts on-chain; it lets anyone verify that a later disclosure of the same step JSON reproduces the same digest. Together with the payment transaction on Kite scan, that gives judges a clear story: money moved, work ran, and the chain holds a compact proof of what class of work completed and how much was attributed to it.

---

## Security Notes

- Payment is verified on-chain (chain, token contract, transfer logs, recipient, and amount) before the agent runs.
- Replay protection: each `paymentTxHash` is inserted in Supabase under a unique constraint; a second claim with the same hash is rejected.
- Budget and pricing for API work are enforced server-side from the verified payment and task configuration, not from unauthenticated client claims alone.
- The attestation signer is a centralized owner key in v1; rotating to multisig or a neutral facilitator is the natural upgrade path for production.

---

## Built By

**Anand Vashishtha** — [X / Twitter](https://twitter.com/Anandvashisht15) · [LinkedIn](https://linkedin.com/in/anandvashishtha)

**Kite AI Global Hackathon 2026** — **Agentic Commerce** track (Encode Club).

Official Kite docs: [docs.gokite.ai](https://docs.gokite.ai/).

---

## License

MIT.

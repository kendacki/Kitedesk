# KiteDesk — project completion checklist

Use this before calling the build “done” for production or hackathon submission. Detailed context lives in [README.md](../README.md).

## Repository quality

- [ ] `npm ci`
- [ ] `npm run format:check`
- [ ] `npm run ship` (lint + production build)

## Chain and contracts

- [ ] `npm run compile:contracts`
- [ ] `npm run deploy:contracts` on Kite testnet (deployer wallet has testnet KITE for gas)
- [ ] `KITE_ATTESTATION_CONTRACT` and `NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT` set to the deployed address
- [ ] `npm run verify:chain` passes (RPC, chain 2368, USDT + attestation bytecode)

## Backend secrets (local: `.env.local`, Vercel: project env)

- [ ] `GROQ_API_KEY` (and optional `GROQ_MODEL`)
- [ ] `ATTESTATION_SIGNER_PRIVATE_KEY` — same wallet as contract owner when you deployed; fund with **KITE** + **USDT** for gas and x402
- [ ] `NEXT_PUBLIC_PLATFORM_WALLET` — USDT recipient for user task payments
- [ ] `NEXT_PUBLIC_APP_URL` — canonical `https://…` origin (matches Vercel domain)
- [ ] `INTERNAL_API_BASE_URL` if `NEXT_PUBLIC_APP_URL` / `VERCEL_URL` is not enough for server-to-server calls
- [ ] Goal tools: `TAVILY_API_KEY`; `FIRECRAWL_API_KEY` if you use `deep_read` in demos
- [ ] x402: `KITE_X402_TOKEN` / `NEXT_PUBLIC_KITE_X402_TOKEN`, `KITE_FACILITATOR_URL` (defaults are in `.env.example`)

## Supabase (recommended for Vercel)

- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run [supabase/migrations/001_kitedesk_tasks.sql](../supabase/migrations/001_kitedesk_tasks.sql) in the SQL editor

Without Supabase, local `next dev` still works using the in-memory store; production should use Supabase for consistent replay protection and `/api/history`.

## Full gate

- [ ] `npm run validate` (format + lint + `simulate` + build)

`simulate` runs `verify:chain` then `verify:backend` (env presence, chain, bytecode, optional `--live-groq`).

## Demo assets

- [ ] Live URL works: marketing `/`, product `/desk`
- [ ] Short screen recording (e.g. wallet connect, task or goal run, explorer links)
- [ ] README “Live Demo” link points at production

# TestSprite MCP — audit record (KiteDesk)

This document summarizes **what was audited** with TestSprite MCP, **what failed**, and **what was fixed** in the codebase. For machine-generated HTML exports, see `testsprite-mcp-test-report.html` (if present).

---

## 1. Document metadata

| Field        | Value                                                                            |
| ------------ | -------------------------------------------------------------------------------- |
| Product      | KiteDesk                                                                         |
| Stack        | Next.js 14 (App Router), TypeScript, Hardhat / Solidity                          |
| Source tree  | `src/app`, `src/components`, `src/hooks`, `src/lib`, `src/types`                 |
| Test tooling | TestSprite MCP (`testsprite_generate_*`, `testsprite_generate_code_and_execute`) |

---

## 2. Scope we audited

| Area                            | Intent                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **HTTP API routes**             | `POST/GET` behavior for `/api/agent`, `/api/history`, `/api/x402/*` (validation, auth assumptions, error codes).       |
| **External test compatibility** | Cloud-generated tests targeted URLs under **`/app/api/...`**, which does not match Next.js public routes (`/api/...`). |
| **Wallet/session UX**           | Navigation between `/` and `/desk`, persistence of connection, MetaMask `accountsChanged` / mount rehydration.         |
| **Landing sign-in**             | “Sign in” previously routed to `/desk`; expected flow is connect on the homepage, then open console.                   |
| **CI / Prettier**               | `format:check` and generated TestSprite assets (e.g. HTML report).                                                     |

---

## 3. TestSprite cloud run (summary)

Backend plan cases **TC001–TC003** (see `testsprite_backend_test_plan.json`) initially **failed** with **HTTP 404** because the runner called:

- `http://localhost:3000/app/api/agent`
- `http://localhost:3000/app/api/history`
- `http://localhost:3000/app/api/x402/verify-and-settle`

Next.js serves route handlers at **`/api/...`** only (files live under `src/app/api/` in the repo, but the **URL path** is `/api/...`).

The **frontend** plan file (`testsprite_frontend_test_plan.json`) was **empty** in that MCP generation pass — no browser E2E cases were scheduled until PRD/upload flows succeed in TestSprite.

---

## 4. Fixes we implemented (product + testability)

| Issue                                      | Fix                                                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong URL prefix for external runners      | **`next.config.mjs`** — `rewrites()` from `/app/api/:path*` → `/api/:path*` (additive; canonical routes unchanged).                                            |
| Wallet state lost on `/desk` → `/`         | **`WalletProvider`** at root layout + `useWallet` consumed from `@/components/WalletProvider` on `/desk` so React state survives client navigation.            |
| Session empty after refresh / remount      | **`hooks/useWallet.ts`** — silent rehydration from `eth_accounts` on mount; **debounced** handling of empty `accountsChanged` before calling `disconnect()`.   |
| Sign-in sent users to desk before connect  | **`MarketingHome`** / **`MobileLandingDock`** — “Sign in” triggers `connect()` on `/`; “Open console” / dock “Console” goes to `/desk` when an address exists. |
| `@/stitches.config` after `src/` migration | **`stitches.config.ts`** co-located under `src/` so the `@/*` alias resolves.                                                                                  |
| Prettier vs generated HTML                 | **`.prettierignore`** — ignore `testsprite-mcp-test-report.html`.                                                                                              |
| Secrets in git                             | **`testsprite_tests/tmp/`** gitignored; generated TC scripts with embedded keys removed from history where applicable.                                         |

Remaining **spec drift**: cloud tests may still assume global API-key auth and REST shapes that differ from production (`POST /api/agent` with payment-verified goal payloads, `GET /api/history?address=…`, `POST /api/x402/verify-and-settle` with `xPaymentHeader`). Address by regenerating tests or extending PRD — not by weakening production auth without review.

---

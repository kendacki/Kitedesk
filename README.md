# KiteDesk

Pay-per-task autonomous AI on [Kite AI](https://docs.gokite.ai/) testnet: connect a wallet, pay USDT for a task, run the Groq-powered agent, and record an on-chain attestation as proof of work.

**Repository:** [github.com/kendacki/Kitedesk](https://github.com/kendacki/Kitedesk)

---

## What it does

1. User connects MetaMask on **Kite AI Testnet** (chain ID **2368**).
2. User picks a task (research, code review, content generation) and pays **USDT** to the platform wallet.
3. The **Groq** API runs the agent (`openai/gpt-oss-120b` by default).
4. The backend writes a **KiteDeskAttestations** contract attestation (result hash on-chain).
5. The UI shows the output plus links to the payment and attestation transactions on the explorer.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| App | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Wallet / chain | ethers.js v6, MetaMask |
| Payments | USDT (ERC-20) on Kite testnet |
| Agent | Groq API |
| Contracts | Solidity 0.8.20, Hardhat |
| Deploy | Vercel (recommended) |

---

## Prerequisites

- Node.js 20+
- MetaMask with Kite testnet configured ([network info](https://docs.gokite.ai/kite-chain/1-getting-started/network-information))
- Testnet **KITE** (gas) and **USDT** from the [faucet](https://faucet.gokite.ai/)
- A **Groq API key** ([console.groq.com](https://console.groq.com/))
- Deployed **KiteDeskAttestations** contract (or use your own address)

---

## Local setup

```bash
git clone https://github.com/kendacki/Kitedesk.git
cd Kitedesk
npm install
```

Copy environment template and fill in **your** values (never commit real secrets):

```bash
cp .env.example .env.local
```

Required variables are documented in **`.env.example`**. At minimum:

- `GROQ_API_KEY`
- `KITE_USDT_CONTRACT` / `NEXT_PUBLIC_KITE_USDT_CONTRACT` (same address)
- `KITE_ATTESTATION_CONTRACT` / `NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT`
- `ATTESTATION_SIGNER_PRIVATE_KEY` (contract owner — must match deployer if you deployed with the default script)
- `NEXT_PUBLIC_PLATFORM_WALLET` (receives USDT payments)

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Smart contract

Compile and deploy to Kite testnet (fund `DEPLOYER_PRIVATE_KEY` with KITE):

```bash
npm run compile:contracts
npm run deploy:contracts
```

Paste the deployed address into `.env.local` as both `KITE_ATTESTATION_CONTRACT` and `NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT`.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (write) |
| `npm run format:check` | Prettier (check) |
| `npm run verify:chain` | RPC + contract bytecode smoke test |
| `npm run verify:backend` | Env + chain checks (optional: `--live-groq`) |
| `npm run simulate` | `verify:chain` + `verify:backend` |
| `npm run validate` | Format check, lint, simulate, build |

---

## Deploy (Vercel)

1. Push this repo to GitHub (secrets stay out of git — use **Vercel Environment Variables**).
2. Import the project in Vercel and set the same keys as `.env.example` (use `NEXT_PUBLIC_*` where the browser needs the value).
3. Production URL is required for hackathon judging if applicable.

---

## Security

- **Do not** commit `.env`, `.env.local`, or private keys.
- Rotate any API key or private key that was ever exposed in chat, logs, or screenshots.
- The attestation signer must be the **owner** of `KiteDeskAttestations` for `attestTask` to succeed.

---

## License

MIT (or adjust to match your team’s preference).

---

## Hackathon / credits

Built for **Agentic Commerce** — **Kite AI Global Hackathon 2026** (Encode Club).  
Kite chain docs: [docs.gokite.ai](https://docs.gokite.ai/).

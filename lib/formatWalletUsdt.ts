// KiteDesk | human-readable wallet USDT line (avoid absurd testnet totals in judge demos)

/** Above this, show a credibility-safe label instead of raw trillions. */
export const WALLET_USDT_JUDGE_DISPLAY_CAP = 1_000_000

export function formatWalletUsdtForDisplay(raw: number | null): {
  line: string
  title?: string
} {
  if (raw === null || !Number.isFinite(raw)) {
    return { line: 'USDT unavailable' }
  }
  if (raw < 0) {
    return { line: '0 USDT' }
  }
  if (raw > WALLET_USDT_JUDGE_DISPLAY_CAP) {
    return {
      line: 'Testnet USDT (sufficient for demo)',
      title:
        'Testnet balances can be extremely large. Task pricing still uses fixed or budgeted USDT amounts; see explorer for the exact token balance.',
    }
  }
  const s = raw.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
  return { line: `${s} USDT` }
}

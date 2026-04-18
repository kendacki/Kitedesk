// KiteDesk | minimal EIP-1193 typing (MetaMask + multi-wallet injectors)

export {}

type Eip1193Ethereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
  isMetaMask?: boolean
  providers?: Eip1193Ethereum[]
}

declare global {
  interface Window {
    ethereum?: Eip1193Ethereum
  }
}

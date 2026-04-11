// KiteDesk | minimal MetaMask EIP-1193 typing for window.ethereum

export {}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

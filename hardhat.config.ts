// KiteDesk | Hardhat config for Kite testnet deployment
import * as dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY?.trim()

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: './contracts',
    cache: './cache/hardhat',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {},
    /** `npx hardhat node` then deploy with same key as one of the printed accounts (chainId 31337). Next.js must use this RPC + chain for wallet testing — separate from Kite testnet. */
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
      accounts: deployerKey ? [deployerKey] : [],
    },
    kiteTestnet: {
      url:
        process.env.KITE_RPC_URL ||
        process.env.NEXT_PUBLIC_KITE_RPC_URL ||
        'https://rpc-testnet.gokite.ai',
      chainId: 2368,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
}

export default config

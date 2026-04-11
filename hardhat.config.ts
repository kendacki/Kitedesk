// KiteDesk | Hardhat config for Kite testnet deployment
import * as dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

dotenv.config({ path: '.env.local' })
dotenv.config()

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
    kiteTestnet: {
      url:
        process.env.KITE_RPC_URL ||
        process.env.NEXT_PUBLIC_KITE_RPC_URL ||
        'https://rpc-testnet.gokite.ai',
      chainId: 2368,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
}

export default config

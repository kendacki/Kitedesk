// KiteDesk | Deploy KiteDeskAttestations to Kite testnet
const hre = require('hardhat')

async function main() {
  const factory = await hre.ethers.getContractFactory('KiteDeskAttestations')
  const contract = await factory.deploy()
  await contract.waitForDeployment()
  const address = await contract.getAddress()
  // eslint-disable-next-line no-console -- deployment script must print the address
  console.log('KiteDeskAttestations deployed to:', address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

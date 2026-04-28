import hre from 'hardhat'

const { ethers } = hre

async function main() {
  console.log('🚀 Deploying SessionKeyValidator contract...\n')

  const SessionKeyValidator = await ethers.getContractFactory('SessionKeyValidator')
  const contract = await SessionKeyValidator.deploy()

  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log(`✅ SessionKeyValidator deployed to: ${address}`)
  console.log(`\n📝 Add this to .env.local:`)
  console.log(`SESSION_KEY_VALIDATOR_ADDRESS=${address}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

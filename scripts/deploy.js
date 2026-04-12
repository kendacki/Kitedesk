// KiteDesk | Deploy KiteDeskAttestations (Kite testnet by default; localhost for hardhat node)
const hre = require('hardhat')

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY?.trim()
  if (!pk) {
    console.error(
      '[deploy] Set DEPLOYER_PRIVATE_KEY in .env or .env.local (0x…, same wallet you fund with KITE for gas).'
    )
    console.error(
      '[deploy] For demos, use the same key as ATTESTATION_SIGNER_PRIVATE_KEY so attestations succeed.'
    )
    process.exitCode = 1
    return
  }

  const net = await hre.ethers.provider.getNetwork()
  const chainId = Number(net.chainId)

  const factory = await hre.ethers.getContractFactory('KiteDeskAttestations')
  const contract = await factory.deploy()
  await contract.waitForDeployment()
  const address = await contract.getAddress()

  console.log('')
  console.log('KiteDeskAttestations deployed to:', address)
  console.log('Chain ID:', chainId)
  console.log('')
  console.log('Add to .env / .env.local (then restart next dev):')
  console.log(`KITE_ATTESTATION_CONTRACT=${address}`)
  console.log(`NEXT_PUBLIC_KITE_ATTESTATION_CONTRACT=${address}`)
  console.log('')
  console.log(
    'Owner (must match ATTESTATION_SIGNER_PRIVATE_KEY wallet):',
    await contract.owner()
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

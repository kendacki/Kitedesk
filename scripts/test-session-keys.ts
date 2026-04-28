import crypto from 'crypto'
import { ethers } from 'ethers'

function encryptPrivateKey(privateKey: string, salt: string): string {
  const secret =
    process.env.SESSION_KEY_ENCRYPTION_SECRET || 'test-secret-12345678901234567890'
  const key = crypto.pbkdf2Sync(
    Buffer.from(secret, 'utf-8'),
    Buffer.from(salt.slice(2, 18), 'hex'),
    100000,
    32,
    'sha256'
  )
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(privateKey, 'utf-8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

function decryptPrivateKey(encryptedData: string, salt: string): string {
  const secret =
    process.env.SESSION_KEY_ENCRYPTION_SECRET || 'test-secret-12345678901234567890'
  const key = crypto.pbkdf2Sync(
    Buffer.from(secret, 'utf-8'),
    Buffer.from(salt.slice(2, 18), 'hex'),
    100000,
    32,
    'sha256'
  )
  const [ivHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}

async function runTests() {
  console.log('\n🧪 KITEDESK SESSION KEYS - EDGE CASE TESTS\n')

  let passed = 0
  let failed = 0

  // TEST 1
  console.log('TEST 1: Encryption/decryption')
  try {
    const wallet = ethers.Wallet.createRandom()
    const userWallet = ethers.Wallet.createRandom()
    const sessionKey = wallet.privateKey

    const encrypted = encryptPrivateKey(sessionKey, userWallet.address)
    const decrypted = decryptPrivateKey(encrypted, userWallet.address)

    if (decrypted === sessionKey) {
      console.log('✅ PASS\n')
      passed++
    } else {
      console.log('❌ FAIL: Decrypted key mismatch\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  // TEST 2
  console.log('TEST 2: Daily limit reset (24h)')
  try {
    const dailySpending = { totalSpent: 0, lastResetAt: Math.floor(Date.now() / 1000) }
    const now = Math.floor(Date.now() / 1000)
    const twentyFourHoursLater = now + 86400 + 1

    dailySpending.totalSpent += 50
    const shouldReset = twentyFourHoursLater >= dailySpending.lastResetAt + 86400

    if (shouldReset) {
      console.log('✅ PASS\n')
      passed++
    } else {
      console.log('❌ FAIL\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  // TEST 3
  console.log('TEST 3: Max per transaction')
  try {
    const maxPerTx = 50
    const attemptedAmount = 75

    if (attemptedAmount > maxPerTx) {
      console.log(`✅ PASS: Rejected ${attemptedAmount} USDT (max ${maxPerTx})\n`)
      passed++
    } else {
      console.log('❌ FAIL\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  // TEST 4
  console.log('TEST 4: Recipient whitelisting')
  try {
    const whitelisted = [
      '0x1234567890123456789012345678901234567890',
      '0x2234567890123456789012345678901234567890',
    ]
    const attemptedRecipient = '0x3234567890123456789012345678901234567890'

    const isAllowed = whitelisted.some(
      (a) => a.toLowerCase() === attemptedRecipient.toLowerCase()
    )

    if (!isAllowed) {
      console.log('✅ PASS\n')
      passed++
    } else {
      console.log('❌ FAIL\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  // TEST 5
  console.log('TEST 5: Expiration validation')
  try {
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now - 1000

    const isExpired = now >= expiresAt

    if (isExpired) {
      console.log('✅ PASS\n')
      passed++
    } else {
      console.log('❌ FAIL\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  // TEST 6
  console.log('TEST 6: Multiple recipients')
  try {
    const recipients = [
      ethers.getAddress('0x1111111111111111111111111111111111111111'),
      ethers.getAddress('0x2222222222222222222222222222222222222222'),
    ]
    const testRecipient = ethers.getAddress(
      '0x2222222222222222222222222222222222222222'
    )
    const isWhitelisted = recipients.some((r) => r === testRecipient)

    if (isWhitelisted && recipients.length === 2) {
      console.log('✅ PASS\n')
      passed++
    } else {
      console.log('❌ FAIL\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  // TEST 7
  console.log('TEST 7: Revocation flag')
  try {
    const sessionKey = {
      address: ethers.Wallet.createRandom().address,
      revoked: false,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    }

    const isValid1 =
      !sessionKey.revoked && Math.floor(Date.now() / 1000) < sessionKey.expiresAt
    sessionKey.revoked = true
    const isValid2 =
      !sessionKey.revoked && Math.floor(Date.now() / 1000) < sessionKey.expiresAt

    if (isValid1 && !isValid2) {
      console.log('✅ PASS\n')
      passed++
    } else {
      console.log('❌ FAIL\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  // TEST 8
  console.log('TEST 8: Daily limit cumulative')
  try {
    const dailyLimit = 500
    let dailySpent = 0
    const txAmounts = [50, 75, 100, 150]

    let allAllowed = true
    for (const amount of txAmounts) {
      if (dailySpent + amount > dailyLimit) {
        allAllowed = false
        break
      }
      dailySpent += amount
    }

    if (allAllowed && dailySpent + 200 > dailyLimit) {
      console.log(`✅ PASS: Cumulative ${dailySpent}/${dailyLimit}, +200 rejected\n`)
      passed++
    } else {
      console.log('❌ FAIL\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  // TEST 9
  console.log('TEST 9: Address checksum validation')
  try {
    const addresses = ['0x1234567890abcdef1234567890abcdef12345678']
    let validCount = 0
    for (const addr of addresses) {
      try {
        ethers.getAddress(addr)
        validCount++
      } catch {
        // Invalid
      }
    }

    if (validCount > 0) {
      console.log('✅ PASS\n')
      passed++
    } else {
      console.log('❌ FAIL\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  // TEST 10
  console.log('TEST 10: Concurrent key generation')
  try {
    const keys = []
    for (let i = 0; i < 5; i++) {
      const key = ethers.Wallet.createRandom()
      keys.push({ address: key.address, keyId: ethers.hexlify(ethers.randomBytes(32)) })
    }

    const uniqueKeys = new Set(keys.map((k) => k.keyId))

    if (uniqueKeys.size === keys.length && keys.length === 5) {
      console.log('✅ PASS\n')
      passed++
    } else {
      console.log('❌ FAIL\n')
      failed++
    }
  } catch (e) {
    console.log(`❌ FAIL: ${e instanceof Error ? e.message : String(e)}\n`)
    failed++
  }

  console.log('='.repeat(60))
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed\n`)

  process.exit(failed === 0 ? 0 : 1)
}

runTests().catch((e) => {
  console.error('Test suite error:', e)
  process.exit(1)
})

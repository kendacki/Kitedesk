// KiteDesk | load env and run scripts/test-x402-facilitator.ts via tsx
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config()

const { register, require: tsxRequire } = require('tsx/cjs/api')
register()

const scriptPath = path.join(__dirname, 'test-x402-facilitator.ts')
tsxRequire(scriptPath, __filename)

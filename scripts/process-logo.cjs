/**
 * KiteDesk | copy logo PNG into public/images/kitedesk-logo.png (no processing)
 * For white→transparent + favicons, use: npm run logo:assets
 *   (or: node scripts/generate-logo-assets.cjs [path-to-source.png])
 * Usage: node scripts/process-logo.cjs <path-to-source.png>
 */
const fs = require('fs')
const path = require('path')

const src = process.argv[2]
if (!src) {
  console.log('Usage: node scripts/process-logo.cjs <path-to-source-logo.png>')
  process.exit(1)
}

const destDir = path.join(__dirname, '..', 'public', 'images')
const dest = path.join(destDir, 'kitedesk-logo.png')

fs.mkdirSync(destDir, { recursive: true })
fs.copyFileSync(path.resolve(src), dest)
console.log('Copied to', dest)

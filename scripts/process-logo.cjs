/**
 * KiteDesk | copy logo PNG into public/images/kitedesk-logo.png
 * Usage: node scripts/process-logo.cjs <path-to-source.png>
 * For background removal, edit the asset in Figma/Photoshop or use a dedicated tool.
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

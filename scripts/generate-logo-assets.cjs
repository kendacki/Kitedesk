/**
 * KiteDesk | white background → transparent PNG; writes public + app icon
 * Usage: node scripts/generate-logo-assets.cjs [path-to-source.png]
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const THRESHOLD = 240

async function main() {
  const input = process.argv[2] || path.join(__dirname, 'source-logo.png')
  if (!fs.existsSync(input)) {
    console.error('Missing source:', input)
    process.exit(1)
  }

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const out = Buffer.from(data)

  for (let i = 0; i < out.length; i += channels) {
    const r = out[i]
    const g = out[i + 1]
    const b = out[i + 2]
    if (r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD) {
      out[i + 3] = 0
    }
  }

  const pngBuffer = await sharp(out, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer()

  const publicDir = path.join(__dirname, '..', 'public', 'images')
  const publicPng = path.join(publicDir, 'kitedesk-logo.png')
  await fs.promises.mkdir(publicDir, { recursive: true })
  await fs.promises.writeFile(publicPng, pngBuffer)

  const icon32 = await sharp(pngBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const appIcon = path.join(__dirname, '..', 'app', 'icon.png')
  await fs.promises.writeFile(appIcon, icon32)

  const iconApple = await sharp(pngBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const appApple = path.join(__dirname, '..', 'app', 'apple-icon.png')
  await fs.promises.writeFile(appApple, iconApple)

  console.log('Wrote', publicPng)
  console.log('Wrote', appIcon)
  console.log('Wrote', appApple)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

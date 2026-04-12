/**
 * KiteDesk | rasterize partner mark SVGs to transparent PNGs in public/images/partners/
 * Run: node scripts/generate-partner-logos.cjs
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const https = require('https')
const path = require('path')
const sharp = require('sharp')
const { siSolidity, siTether } = require('simple-icons/icons')

const outDir = path.join(__dirname, '..', 'public', 'images', 'partners')
const TARGET_H = 40

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'KiteDesk-logo-script/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location
          if (!loc) {
            reject(new Error('Redirect without location'))
            return
          }
          fetchText(new URL(loc, url).href).then(resolve).catch(reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} -> ${res.statusCode}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      })
      .on('error', reject)
  })
}

function iconSvg(si, fill = '#334155') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img"><title>${si.title}</title><path fill="${fill}" d="${si.path}"/></svg>`
}

async function svgBufferToPng(svg, filename) {
  const out = path.join(outDir, filename)
  await fs.promises.mkdir(outDir, { recursive: true })
  await sharp(Buffer.from(svg), { density: 300 })
    .resize({
      height: TARGET_H,
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(out)
  console.log('wrote', path.relative(process.cwd(), out))
}

/** Official Kite mark + wordmark: strip near-white pixels to alpha, then resize. */
async function kitePngFromSource() {
  const srcPath = path.join(__dirname, 'source-kite-logo.png')
  await fs.promises.access(srcPath)
  const base = sharp(srcPath).ensureAlpha()
  const { data, info } = await base.clone().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  if (channels !== 4) {
    throw new Error(`Expected 4 channels after ensureAlpha, got ${channels}`)
  }
  const threshold = 248
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0
    }
  }
  const out = path.join(outDir, 'kite.png')
  await fs.promises.mkdir(outDir, { recursive: true })
  await sharp(Buffer.from(data), {
    raw: { width, height, channels: 4 },
  })
    .trim()
    .resize({
      height: TARGET_H,
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(out)
  console.log('wrote', path.relative(process.cwd(), out), '(from source-kite-logo.png)')
}

async function main() {
  await svgBufferToPng(iconSvg(siSolidity), 'solidity.png')
  await svgBufferToPng(iconSvg(siTether), 'usdt.png')

  const mmSvg = await fetchText(
    'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg'
  )
  await svgBufferToPng(mmSvg, 'metamask.png')

  /** Groq wordmark (simplified path from public brand SVGs; single path, slate fill) */
  const groqSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" fill="none">
  <text x="0" y="24" font-family="system-ui,Segoe UI,sans-serif" font-size="22" font-weight="700" fill="#334155">Groq</text>
</svg>`
  await svgBufferToPng(groqSvg, 'groq.png')

  await kitePngFromSource()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

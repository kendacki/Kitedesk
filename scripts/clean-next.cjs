#!/usr/bin/env node
// KiteDesk | remove .next (fixes "Cannot find module './NNN.js'" and broken HMR)
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '..', '.next')
fs.rmSync(dir, { recursive: true, force: true })
console.log('Removed .next — run: npm run dev')

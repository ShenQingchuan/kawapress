#!/usr/bin/env node
import process from 'node:process'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
jiti.import('../src/cli.ts').catch((error) => {
  console.error(error)
  process.exit(1)
})

#!/usr/bin/env node
import process from 'node:process'
import { consola } from 'consola'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
jiti.import('../src/cli.ts').catch((error) => {
  consola.error(error)
  process.exit(1)
})

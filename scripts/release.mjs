#!/usr/bin/env node
// @env node

/** Thin CLI wrapper; every step lives in `scripts/release/`. */

import process from 'node:process'

import { main } from './release/main.mjs'

main().catch((error) => {
  console.error(`\nRelease failed: ${error.message}`)
  process.exitCode = 1
})

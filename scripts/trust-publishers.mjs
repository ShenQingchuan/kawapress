#!/usr/bin/env node
// @env node

/**
 * Makes every public package trust the `release.yml` workflow of this repository.
 * It reads the current npm configuration first, so a rerun is safe and a stale
 * configuration, such as one for the repository's old owner, is replaced.
 * Without `--apply` it only reports. It needs `npm login` and a terminal for npm's 2FA prompt.
 */

import process from 'node:process'

import { discoverPackages } from './release/packages.mjs'
import { syncTrust } from './release/trust.mjs'

function printUsage() {
  console.log(`Configure npm trusted publishers

Usage:
  pnpm release:trust            # report what would change, no changes
  pnpm release:trust --apply    # make every package trust this repository
`)
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage()
    return
  }

  const unknown = argv.filter(argument => argument !== '--apply')
  if (unknown.length > 0)
    throw new Error(`Unknown argument: ${unknown.join(', ')}`)

  const packages = await discoverPackages()
  const names = packages.map(packageInfo => packageInfo.manifest.name)
  await syncTrust(names, { apply: argv.includes('--apply') })
}

main().catch((error) => {
  console.error(`\nTrusted publisher setup failed: ${error.message}`)
  process.exitCode = 1
})

#!/usr/bin/env node
// @env node

/**
 * Attaches the `release.yml` workflow as a trusted publisher to every public package.
 * Dry-run by default; pass `--apply` to talk to npm for real (needs `npm login`).
 */

import process from 'node:process'

import { discoverPackages } from './release/packages.mjs'
import { runTrustCommands } from './release/trust.mjs'

function printUsage() {
  console.log(`Configure npm trusted publishers

Usage:
  pnpm release:trust            # print the commands npm would run, no changes
  pnpm release:trust --apply    # create the trusted publisher for every package
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
  await runTrustCommands(names, { apply: argv.includes('--apply') })
}

main().catch((error) => {
  console.error(`\nTrusted publisher setup failed: ${error.message}`)
  process.exitCode = 1
})

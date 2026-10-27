#!/usr/bin/env node
// @env node

/**
 * Requires two-factor authentication and disallows tokens for publishing every
 * public package. Prints the commands by default; pass `--apply` to change npm
 * for real (needs `npm login`).
 */

import process from 'node:process'

import { discoverPackages } from './release/packages.mjs'
import { runPublishingAccessCommands } from './release/publishing-access.mjs'

function printUsage() {
  console.log(`Lock down npm publishing access

Usage:
  pnpm release:lock            # print the commands, no changes
  pnpm release:lock --apply    # require 2FA and disallow tokens for every package
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
  await runPublishingAccessCommands(names, { apply: argv.includes('--apply') })
}

main().catch((error) => {
  console.error(`\nPublishing access update failed: ${error.message}`)
  process.exitCode = 1
})

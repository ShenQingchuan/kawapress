/** npm trusted publisher configuration commands. */

import { setTimeout as delay } from 'node:timers/promises'

import { publishEnvironment, publishRepository, publishWorkflowFile } from './constants.mjs'
import { logStep, logSuccess, run } from './runtime.mjs'

export const TRUST_COMMAND_PAUSE_MS = 2_000

/** CLI arguments (without the `npm` binary) that attach a trusted publisher to one package. */
export function buildTrustArguments(name) {
  return [
    'trust',
    'github',
    name,
    '--file',
    publishWorkflowFile,
    '--repository',
    publishRepository,
    '--environment',
    publishEnvironment,
    '--allow-publish',
    '-y',
  ]
}

/** Copy-pasteable shell line for one package. */
export function formatTrustCommand(name) {
  return `npm ${buildTrustArguments(name).join(' ')}`
}

export function printTrustCommands(names) {
  logStep(`npm trusted publisher commands for ${names.length} package(s)`)
  console.log('Run these once from a logged-in terminal, in this order, with a pause between')
  console.log('each call; npm asks for two-factor authentication in the browser only once.')
  console.log('')
  console.log(names.map(formatTrustCommand).join('\n'))
  console.log('')
  console.log('Or let the helper do it: pnpm release:trust --apply')
}

/**
 * Runs `npm trust github` for every package. Dry-run by default: it passes
 * `--dry-run` to npm, which validates the config against the registry without 2FA.
 */
export async function runTrustCommands(names, options = {}) {
  const { apply = false, registry, pauseMs = TRUST_COMMAND_PAUSE_MS } = options
  logStep(apply ? 'Configuring npm trusted publishers' : 'Checking npm trusted publisher commands (dry run)')

  for (const [index, name] of names.entries()) {
    const args = buildTrustArguments(name)
    if (!apply)
      args.push('--dry-run')
    if (registry)
      args.push(`--registry=${registry}`)

    await run('npm', args)
    logSuccess(`${name}${apply ? '' : ' (dry run)'}`)

    if (index < names.length - 1)
      await delay(pauseMs)
  }
}

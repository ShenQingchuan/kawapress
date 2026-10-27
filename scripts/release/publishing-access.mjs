/** npm publishing access: who may publish a package besides the trusted publisher. */

import { setTimeout as delay } from 'node:timers/promises'

import { logStep, logSuccess, run } from './runtime.mjs'

/**
 * `npm access set mfa=publish`: publishing needs two-factor authentication and
 * tokens that bypass it are refused. Trusted publishing keeps working, because
 * it authenticates with OIDC instead of a token.
 */
export const PUBLISHING_MFA_LEVEL = 'publish'

const ACCESS_COMMAND_PAUSE_MS = 2_000

/** CLI arguments (without the `npm` binary) that lock down publishing for one package. */
export function buildPublishingAccessArguments(name) {
  return ['access', 'set', `mfa=${PUBLISHING_MFA_LEVEL}`, name]
}

/** Copy-pasteable shell line for one package. */
export function formatPublishingAccessCommand(name) {
  return `npm ${buildPublishingAccessArguments(name).join(' ')}`
}

/**
 * Applies the publishing access level to every package, or only prints the
 * commands. `npm access set` has no dry-run mode of its own, so the default
 * run talks to nobody.
 */
export async function runPublishingAccessCommands(names, options = {}) {
  const { apply = false, registry, pauseMs = ACCESS_COMMAND_PAUSE_MS } = options

  if (!apply) {
    logStep(`npm publishing access commands for ${names.length} package(s)`)
    console.log(names.map(formatPublishingAccessCommand).join('\n'))
    console.log('\nRun them all with: pnpm release:lock --apply')
    return
  }

  logStep('Requiring two-factor authentication and disallowing tokens for publishing')
  for (const [index, name] of names.entries()) {
    const args = buildPublishingAccessArguments(name)
    if (registry)
      args.push(`--registry=${registry}`)

    await run('npm', args)
    logSuccess(name)

    if (index < names.length - 1)
      await delay(pauseMs)
  }
}

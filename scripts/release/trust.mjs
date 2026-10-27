/** npm trusted publisher configuration: read what npm has, then make it match the repository. */

import { setTimeout as delay } from 'node:timers/promises'

import { publishEnvironment, publishRepository, publishWorkflowFile } from './constants.mjs'
import { logStep, logSuccess, run } from './runtime.mjs'

export const TRUST_COMMAND_PAUSE_MS = 2_000

/** The one trusted publisher every package must have. */
export const desiredTrust = {
  environment: publishEnvironment,
  file: publishWorkflowFile,
  repository: publishRepository,
  type: 'github',
}

/** CLI arguments (without the `npm` binary) that attach the trusted publisher to one package. */
export function buildTrustArguments(name) {
  return [
    'trust',
    'github',
    name,
    '--file',
    desiredTrust.file,
    '--repository',
    desiredTrust.repository,
    '--environment',
    desiredTrust.environment,
    '--allow-publish',
    '-y',
  ]
}

/** Copy-pasteable shell line for one package. */
export function formatTrustCommand(name) {
  return `npm ${buildTrustArguments(name).join(' ')}`
}

export function printTrustCommands(names) {
  logStep(`Trusted publisher for ${names.length} package(s)`)
  console.log('Let the helper configure all of them, and replace any stale configuration:')
  console.log('  pnpm release:trust --apply')
}

/**
 * `npm trust list --json` prints one flat JSON object per configuration, one after
 * the other. Returns them as an array; an empty output means no configuration.
 */
export function parseTrustList(output) {
  return (output.match(/\{[^{}]*\}/g) ?? []).map(item => JSON.parse(item))
}

/** True when an existing configuration is exactly the one we want, publish permission included. */
export function isDesiredTrust(config) {
  return config.type === desiredTrust.type
    && config.repository === desiredTrust.repository
    && config.file === desiredTrust.file
    && config.environment === desiredTrust.environment
    && Array.isArray(config.permissions)
    && config.permissions.includes('createPackage')
}

/**
 * Decides what to do for one package: nothing when the right configuration is there,
 * otherwise revoke every other configuration and create the right one. npm accepts one
 * configuration at a time, so a stale one has to go first.
 */
export function planTrustChange(existing) {
  const hasDesired = existing.some(isDesiredTrust)
  return {
    create: !hasDesired,
    revoke: existing.filter(config => !isDesiredTrust(config) && config.id).map(config => config.id),
  }
}

async function readTrust(name, registry) {
  const args = ['trust', 'list', name, '--json']
  if (registry)
    args.push(`--registry=${registry}`)
  const result = await run('npm', args, { interactive: true })
  return parseTrustList(result.stdout)
}

/**
 * Brings every package's trusted publisher in line with `desiredTrust`. Without `apply`
 * it only reports what would change. Reading needs npm's two-factor prompt in the browser,
 * so run it from a terminal; npm remembers the answer for a few minutes.
 */
export async function syncTrust(names, options = {}) {
  const { apply = false, registry, pauseMs = TRUST_COMMAND_PAUSE_MS } = options
  logStep(`${apply ? 'Configuring' : 'Checking'} npm trusted publishers for ${desiredTrust.repository}`)

  let changed = 0
  for (const [index, name] of names.entries()) {
    const plan = planTrustChange(await readTrust(name, registry))

    if (!plan.create && plan.revoke.length === 0) {
      logSuccess(`${name} (already correct)`)
    }
    else {
      changed += 1
      const steps = [...plan.revoke.map(id => `revoke ${id}`), ...(plan.create ? ['create'] : [])]
      if (!apply) {
        console.log(`! ${name}: would ${steps.join(', then ')}`)
      }
      else {
        for (const id of plan.revoke) {
          await run('npm', ['trust', 'revoke', name, `--id=${id}`, ...(registry ? [`--registry=${registry}`] : [])])
          await delay(pauseMs)
        }
        if (plan.create)
          await run('npm', [...buildTrustArguments(name), ...(registry ? [`--registry=${registry}`] : [])])
        logSuccess(`${name} (${steps.join(', then ')})`)
      }
    }

    if (index < names.length - 1)
      await delay(pauseMs)
  }

  console.log(changed === 0
    ? '\nEvery package already trusts this repository.'
    : apply ? `\nUpdated ${changed} package(s).` : `\n${changed} package(s) need an update. Run again with --apply.`)
}

/** npm registry reads: published integrity, dist-tags, and existence checks. */

import { setTimeout as delay } from 'node:timers/promises'

import { defaultRegistry } from './constants.mjs'
import { CommandError, logStep, logSuccess, logWarning, run } from './runtime.mjs'
import { compareSemver, parseSemver } from './semver.mjs'

function isNotFound(result) {
  return /E404|404 Not Found/i.test(result.stderr)
}

/** `dist.integrity` of a published version, or null when the version does not exist. */
export async function getPublishedIntegrity(name, version, registry) {
  const args = [
    'view',
    `${name}@${version}`,
    'dist.integrity',
    '--json',
    `--registry=${registry}`,
  ]
  const result = await run('npm', args, { allowFailure: true, capture: true })

  if (result.exitCode === 0) {
    const value = JSON.parse(result.stdout || 'null')
    return typeof value === 'string' ? value : null
  }

  if (isNotFound(result))
    return null

  throw new CommandError('npm', args, result)
}

export async function waitForPublishedIntegrity(packageInfo, registry) {
  const attempts = 4
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const integrity = await getPublishedIntegrity(
      packageInfo.name,
      packageInfo.version,
      registry,
    )
    if (integrity === packageInfo.integrity)
      return true
    if (integrity && integrity !== packageInfo.integrity)
      throw new Error(`Registry integrity verification failed for ${packageInfo.name}.`)
    if (attempt < attempts - 1)
      await delay(1_000)
  }

  return false
}

export async function getPublishedTags(name, registry) {
  const args = [
    'dist-tag',
    'ls',
    name,
    `--registry=${registry}`,
  ]
  const result = await run('npm', args, { allowFailure: true, capture: true })

  if (result.exitCode !== 0) {
    if (isNotFound(result))
      return null
    throw new CommandError('npm', args, result)
  }

  const output = result.stdout.trim()
  if (!output)
    return {}

  try {
    const value = JSON.parse(output)
    if (value && typeof value === 'object')
      return value
  }
  catch {
    // npm 11 returns "tag: version" lines for dist-tag ls.
  }

  return Object.fromEntries(output.split(/\r?\n/).map((line) => {
    const separator = line.indexOf(': ')
    if (separator < 1)
      throw new Error(`Could not parse npm dist-tag output: ${line}`)
    return [line.slice(0, separator), line.slice(separator + 2)]
  }))
}

export async function getPublishedTag(name, tag, registry) {
  const tags = await getPublishedTags(name, registry)
  return typeof tags?.[tag] === 'string' ? tags[tag] : null
}

const DIST_TAG_WAIT_ATTEMPTS = 36
const DIST_TAG_WAIT_INTERVAL_MS = 5_000

export async function waitForDistTag(packageInfo, tag, registry) {
  let current = null
  for (let attempt = 0; attempt < DIST_TAG_WAIT_ATTEMPTS; attempt += 1) {
    current = await getPublishedTag(packageInfo.name, tag, registry)
    if (current === packageInfo.version)
      return
    if (attempt < DIST_TAG_WAIT_ATTEMPTS - 1)
      await delay(DIST_TAG_WAIT_INTERVAL_MS)
  }

  throw new Error(
    `${packageInfo.name}@${packageInfo.version} is not yet reported as ${tag} by the registry (currently ${current}). The registry is still propagating; rerun the same command to resume.`,
  )
}

export async function ensureDistTag(packageInfo, tag, registry) {
  const current = await getPublishedTag(packageInfo.name, tag, registry)
  if (current === packageInfo.version)
    return

  if (current && compareSemver(parseSemver(current), parseSemver(packageInfo.version)) > 0) {
    throw new Error(
      `Refusing to move dist-tag ${tag} backwards from ${current} to ${packageInfo.version} for ${packageInfo.name}.`,
    )
  }

  await run('npm', [
    'dist-tag',
    'add',
    `${packageInfo.name}@${packageInfo.version}`,
    tag,
    `--registry=${registry}`,
  ])

  await waitForDistTag(packageInfo, tag, registry)
}

/**
 * Classifies every package as `identical` (same tarball already published, so the
 * release can be resumed), `pending` (version published but metadata still lagging),
 * or `available` (still to publish).
 */
export async function inspectRegistry(packages, registry, tag) {
  logStep('Checking npm version availability')
  const states = new Map()

  for (const packageInfo of packages) {
    const [publishedIntegrity, publishedTags] = await Promise.all([
      getPublishedIntegrity(packageInfo.name, packageInfo.version, registry),
      getPublishedTags(packageInfo.name, registry),
    ])

    if (publishedIntegrity && publishedIntegrity !== packageInfo.integrity) {
      throw new Error(
        `${packageInfo.name}@${packageInfo.version} already exists with different contents.`,
      )
    }

    if (publishedIntegrity === packageInfo.integrity)
      states.set(packageInfo.name, 'identical')
    else if (Object.values(publishedTags ?? {}).includes(packageInfo.version))
      states.set(packageInfo.name, 'pending')
    else
      states.set(packageInfo.name, 'available')

    const current = publishedTags?.[tag]
    if (current && compareSemver(parseSemver(current), parseSemver(packageInfo.version)) > 0) {
      throw new Error(
        `Refusing to move dist-tag ${tag} backwards from ${current} to ${packageInfo.version} for ${packageInfo.name}.`,
      )
    }
  }

  const available = [...states.values()].filter(state => state === 'available').length
  const identical = [...states.values()].filter(state => state === 'identical').length
  const pending = states.size - available - identical
  const details = [
    identical ? `${identical} identical` : '',
    pending ? `${pending} awaiting npm metadata` : '',
  ].filter(Boolean).join('; ')
  logSuccess(`${available} versions available${details ? `; ${details}` : ''}`)
  return states
}

/**
 * Names from `names` that npm does not know yet. A trusted publisher can only be
 * attached to an existing package, and CI must never publish a partial release.
 */
export async function findMissingPackages(names, options = {}) {
  const { registry = defaultRegistry, run: runCommand = run } = options

  const results = await Promise.all(names.map(async (name) => {
    const args = ['view', name, 'version', '--json', `--registry=${registry}`]
    const result = await runCommand('npm', args, { allowFailure: true, capture: true })

    if (result.exitCode === 0)
      return null
    if (isNotFound(result))
      return name
    throw new CommandError('npm', args, result)
  }))

  return results.filter(name => typeof name === 'string')
}

/** Logs how many packages still have to be bootstrapped. */
export function logMissingPackages(missing) {
  if (missing.length === 0)
    logSuccess('Every public package already exists on npm')
  else
    logWarning(`Missing from npm: ${missing.join(', ')}`)
}

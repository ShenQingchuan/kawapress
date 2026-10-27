/** npm registry reads: published integrity, dist-tags, and existence checks. */

import { setTimeout as delay } from 'node:timers/promises'

import { defaultRegistry } from './constants.mjs'
import { CommandError, logStep, logSuccess, logWarning, run } from './runtime.mjs'
import { compareSemver, parseSemver } from './semver.mjs'

function isNotFound(result) {
  return /E404|404 Not Found/i.test(result.stderr)
}

/**
 * True when npm knows the package. `npm view` answers 404 for an unknown name, which is
 * the only reliable signal: `npm dist-tag ls` answers 401 for names that do not exist.
 */
export async function packageExistsOnNpm(name, options = {}) {
  const { registry = defaultRegistry, run: runCommand = run } = options
  const args = ['view', name, 'version', '--json', `--registry=${registry}`]
  const result = await runCommand('npm', args, { allowFailure: true, capture: true })

  if (result.exitCode === 0)
    return true
  if (isNotFound(result))
    return false
  throw new CommandError('npm', args, result)
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
    // An unpublished package answers 401 here instead of 404; only a real failure throws.
    if (!await packageExistsOnNpm(name, { registry }))
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
 * Decides what a release does with one package, given what npm already holds for
 * its version. A version that exists on npm is never published again, so a release
 * of an older version number can add the packages that are new without touching the
 * ones that already have it.
 *
 * - `identical`: the same tarball is published, so a rerun resumes the release.
 * - `pending`: the version is published but npm metadata is still lagging.
 * - `published`: the version exists with other contents. The package is skipped.
 * - `available`: the version does not exist yet, so it is published.
 */
export function classifyPackage({ integrity, publishedIntegrity, publishedTags, version }) {
  if (publishedIntegrity && publishedIntegrity !== integrity)
    return 'published'
  if (publishedIntegrity === integrity)
    return 'identical'
  if (Object.values(publishedTags ?? {}).includes(version))
    return 'pending'
  return 'available'
}

/** Packages that this run will leave alone because npm already has their version. */
export function isSkippedState(state) {
  return state === 'published'
}

/** Classifies every package, see `classifyPackage`. */
export async function inspectRegistry(packages, registry, tag) {
  logStep('Checking npm version availability')
  const states = new Map()

  for (const packageInfo of packages) {
    const [publishedIntegrity, publishedTags] = await Promise.all([
      getPublishedIntegrity(packageInfo.name, packageInfo.version, registry),
      getPublishedTags(packageInfo.name, registry),
    ])

    const state = classifyPackage({
      integrity: packageInfo.integrity,
      publishedIntegrity,
      publishedTags,
      version: packageInfo.version,
    })
    states.set(packageInfo.name, state)

    if (isSkippedState(state)) {
      logWarning(
        `${packageInfo.name}@${packageInfo.version} is already on npm with other contents; skipping it. Bump the version to publish its current source.`,
      )
      continue
    }

    const current = publishedTags?.[tag]
    if (current && compareSemver(parseSemver(current), parseSemver(packageInfo.version)) > 0) {
      throw new Error(
        `Refusing to move dist-tag ${tag} backwards from ${current} to ${packageInfo.version} for ${packageInfo.name}.`,
      )
    }
  }

  const available = [...states.values()].filter(state => state === 'available').length
  const identical = [...states.values()].filter(state => state === 'identical').length
  const skipped = [...states.values()].filter(isSkippedState).length
  const pending = states.size - available - identical - skipped
  const details = [
    identical ? `${identical} identical` : '',
    skipped ? `${skipped} already published, skipped` : '',
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
  const exists = await Promise.all(names.map(name => packageExistsOnNpm(name, options)))
  return names.filter((name, index) => !exists[index])
}

/** Logs how many packages still have to be bootstrapped. */
export function logMissingPackages(missing) {
  if (missing.length === 0)
    logSuccess('Every public package already exists on npm')
  else
    logWarning(`Missing from npm: ${missing.join(', ')}`)
}

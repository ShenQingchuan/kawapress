/** Discovery of the public packages and the local version helpers. */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { normalizeRegistry } from './cli.mjs'
import { defaultRegistry, rootDir, unscopedPackageNames } from './constants.mjs'
import { pathExists, readJson } from './runtime.mjs'
import { compareSemver, parseSemver } from './semver.mjs'

/** Every non-private package under `packages/`, sorted by directory name. */
export async function discoverPackages() {
  const packagesDir = join(rootDir, 'packages')
  const entries = await readdir(packagesDir, { withFileTypes: true })
  const packages = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory())
      continue

    const directory = join(packagesDir, entry.name)
    const manifestPath = join(directory, 'package.json')
    if (!await pathExists(manifestPath))
      continue

    const manifest = await readJson(manifestPath)
    if (manifest.private === true)
      continue

    packages.push({
      directory,
      manifest,
      manifestPath,
      relativeDirectory: relative(rootDir, directory),
    })
  }

  if (packages.length === 0)
    throw new Error('No public packages were found under packages/.')

  const names = new Set()
  for (const packageInfo of packages) {
    const { manifest, relativeDirectory } = packageInfo
    if (!manifest.name || !manifest.version)
      throw new Error(`${relativeDirectory}/package.json needs name and version.`)
    if (names.has(manifest.name))
      throw new Error(`Duplicate package name: ${manifest.name}`)
    if (!unscopedPackageNames.has(manifest.name) && !manifest.name.startsWith('@kawapress/'))
      throw new Error(`Unexpected public package name: ${manifest.name}`)
    if (manifest.license !== 'MIT')
      throw new Error(`${manifest.name} must declare the MIT license.`)
    if (!manifest.exports || !manifest.files)
      throw new Error(`${manifest.name} must declare exports and files.`)
    if (manifest.publishConfig?.access !== 'public')
      throw new Error(`${manifest.name} must set publishConfig.access to public.`)
    if (normalizeRegistry(manifest.publishConfig?.registry ?? '') !== defaultRegistry)
      throw new Error(`${manifest.name} must publish to ${defaultRegistry}.`)

    names.add(manifest.name)
  }

  return packages
}

/** The version all public packages share, verified to be a single lockstep version. */
export function readLockstepVersion(packages) {
  const versions = new Set(packages.map(packageInfo => packageInfo.manifest.version))
  if (versions.size !== 1) {
    throw new Error(`Public package versions must match. Found: ${[...versions].join(', ')}`)
  }

  const raw = [...versions][0]
  parseSemver(raw)
  return raw
}

export function assertVersionIsNotOlder(targetVersion, currentVersion) {
  if (compareSemver(parseSemver(targetVersion), parseSemver(currentVersion)) < 0) {
    throw new Error(`Target version ${targetVersion} is lower than current version ${currentVersion}.`)
  }
}

/**
 * Rewrites the `version` field of every public package.json, keeping the rest of the
 * file byte-identical by applying a generated patch instead of re-serialising JSON.
 */
/**
 * Manifest fields that hold the lockstep release version. `kawapressVersion` is
 * the `kawapress` version `create-kawapress` writes into new sites, so it moves
 * together with the package versions.
 */
export const LOCKSTEP_VERSION_FIELDS = ['version', 'kawapressVersion']

/**
 * Rewrites every lockstep version field of one manifest, keeping the rest of the
 * file byte for byte. Returns the new content, or `undefined` when nothing changes.
 */
export function bumpManifestVersions(content, version) {
  let changed = false
  const next = content.split('\n').map((line) => {
    for (const field of LOCKSTEP_VERSION_FIELDS) {
      const match = new RegExp(`^ {2}"${field}": "([^"]+)"(,?)$`).exec(line)
      if (match && match[1] !== version) {
        changed = true
        return `  "${field}": "${version}"${match[2]}`
      }
    }
    return line
  }).join('\n')
  return changed ? next : undefined
}

export async function updateWorkspaceVersions(packages, version) {
  const updates = []
  for (const packageInfo of packages) {
    const content = await readFile(packageInfo.manifestPath, 'utf8')
    if (!/^ {2}"version": "[^"]+",$/m.test(content))
      throw new Error(`Could not find the version line in ${packageInfo.relativeDirectory}/package.json.`)
    const next = bumpManifestVersions(content, version)
    if (next !== undefined)
      updates.push([packageInfo.manifestPath, next])
  }

  for (const [path, content] of updates)
    await writeFile(path, content)
}

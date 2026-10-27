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

/** Every public package's name → current version. */
export function readVersions(packages) {
  const versions = new Map()
  for (const { manifest } of packages) {
    parseSemver(manifest.version)
    versions.set(manifest.name, manifest.version)
  }
  return versions
}

/**
 * Finds a package by its full npm name (`@kawapress/plugin-mermaid`, `kawapress`).
 * Directory names and other short forms are rejected on purpose: a short name
 * could one day match two packages, and a release must never guess.
 */
export function findPackage(packages, name) {
  const found = packages.find(({ manifest }) => manifest.name === name)
  if (!found) {
    const known = packages.map(({ manifest }) => manifest.name).join(', ')
    throw new Error(`Unknown package "${name}". Use the full npm name. Known packages: ${known}`)
  }
  return found
}

/**
 * Parses `name=version` bump requests. Each version must be a valid semver that is
 * higher than the package's current one.
 */
export function parseBumps(packages, requests) {
  const bumps = new Map()
  for (const request of requests) {
    const separator = request.lastIndexOf('=')
    if (separator < 1 || separator === request.length - 1)
      throw new Error(`Expected <package>=<version>, got "${request}".`)

    const { manifest } = findPackage(packages, request.slice(0, separator))
    const version = request.slice(separator + 1)
    if (compareSemver(parseSemver(version), parseSemver(manifest.version)) <= 0)
      throw new Error(`${manifest.name} is already at ${manifest.version}. Choose a version higher than that, not ${version}.`)
    if (bumps.has(manifest.name))
      throw new Error(`${manifest.name} was listed twice.`)
    bumps.set(manifest.name, version)
  }
  return bumps
}

/**
 * Manifest fields that hold a version other than the package's own. `kawapressVersion`
 * is the `kawapress` version `create-kawapress` writes into new sites.
 */
const EXTRA_VERSION_FIELDS = ['kawapressVersion']

/**
 * Rewrites one top-level `"field": "value"` line, keeping the rest of the file byte for
 * byte. Returns the new content, or `undefined` when the field is absent or already right.
 */
export function setManifestField(content, field, value) {
  let changed = false
  const next = content.split('\n').map((line) => {
    const match = new RegExp(`^ {2}"${field}": "([^"]+)"(,?)$`).exec(line)
    if (match && match[1] !== value) {
      changed = true
      return `  "${field}": "${value}"${match[2]}`
    }
    return line
  }).join('\n')
  return changed ? next : undefined
}

/**
 * Writes the new versions into package.json files. `kawapressVersion` always follows
 * the `kawapress` package, so a site created by `create-kawapress` gets the core
 * version that exists on npm. Returns the manifests that changed.
 */
export async function applyBumps(packages, bumps) {
  const kawapress = findPackage(packages, 'kawapress')
  const kawapressVersion = bumps.get('kawapress') ?? kawapress.manifest.version
  const changed = []

  for (const packageInfo of packages) {
    let content = await readFile(packageInfo.manifestPath, 'utf8')
    const original = content
    const version = bumps.get(packageInfo.manifest.name)

    if (version) {
      const next = setManifestField(content, 'version', version)
      if (next === undefined)
        throw new Error(`Could not find the version line in ${packageInfo.relativeDirectory}/package.json.`)
      content = next
    }
    for (const field of EXTRA_VERSION_FIELDS)
      content = setManifestField(content, field, kawapressVersion) ?? content

    if (content !== original) {
      await writeFile(packageInfo.manifestPath, content)
      changed.push(packageInfo.manifest.name)
    }
  }
  return changed
}

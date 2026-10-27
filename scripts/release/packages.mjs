/** Discovery of the public packages and the local version helpers. */

import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { normalizeRegistry } from './cli.mjs'
import { defaultRegistry, rootDir, unscopedPackageNames } from './constants.mjs'
import { pathExists, readJson, run } from './runtime.mjs'
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
export async function updateWorkspaceVersions(packages, version) {
  const patchSections = []

  for (const packageInfo of packages) {
    const content = await readFile(packageInfo.manifestPath, 'utf8')
    const lines = content.split('\n')
    const versionLineIndex = lines.findIndex(line => /^ {2}"version": "[^"]+",$/.test(line))
    if (versionLineIndex < 0)
      throw new Error(`Could not find the version line in ${packageInfo.relativeDirectory}/package.json.`)

    const oldLine = lines[versionLineIndex]
    const newLine = `  "version": "${version}",`
    if (oldLine === newLine)
      continue

    const previousLine = lines[versionLineIndex - 1]
    const nextLine = lines[versionLineIndex + 1]
    if (previousLine === undefined || nextLine === undefined)
      throw new Error(`The version line in ${packageInfo.relativeDirectory}/package.json needs surrounding context.`)

    const path = `${packageInfo.relativeDirectory}/package.json`.replaceAll('\\', '/')
    const hunkStart = versionLineIndex
    patchSections.push([
      `diff --git a/${path} b/${path}`,
      `--- a/${path}`,
      `+++ b/${path}`,
      `@@ -${hunkStart},3 +${hunkStart},3 @@`,
      ` ${previousLine}`,
      `-${oldLine}`,
      `+${newLine}`,
      ` ${nextLine}`,
      '',
    ].join('\n'))
  }

  if (patchSections.length === 0)
    return

  const patchDirectory = await mkdtemp(join(tmpdir(), 'kawapress-version-'))
  const patchPath = join(patchDirectory, 'versions.patch')
  try {
    await writeFile(patchPath, patchSections.join(''))
    await run('git', ['apply', '--check', patchPath], { capture: true })
    await run('git', ['apply', patchPath], { capture: true })
  }
  finally {
    await rm(patchDirectory, { force: true, recursive: true })
  }
}

/** Staged copy, tarball packing, and tarball validation. */

import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import { expectedCatalogRange, expectedWorkspaceRange, readCatalogs } from './catalogs.mjs'
import {
  manifestDependencyFields,
  publishedDependencyFields,
  readmeFiles,
  rootDir,
  sensitiveFilePattern,
  testFilePattern,
} from './constants.mjs'
import { logStep, logSuccess, pathExists, readJson, run, writeJson } from './runtime.mjs'

/**
 * Copies the workspace into a temporary directory so the tarballs come out correct
 * without touching the real tree. Packages keep their own version; a bootstrap passes
 * `versionOverride` to pin every package to a placeholder version instead.
 */
export async function copyReleaseWorkspace(packages, versionOverride) {
  const stagingDir = await mkdtemp(join(tmpdir(), 'kawapress-release-'))
  const rootFiles = [
    'LICENSE',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
  ]

  for (const file of rootFiles)
    await cp(join(rootDir, file), join(stagingDir, file))

  await cp(join(rootDir, 'packages'), join(stagingDir, 'packages'), {
    filter(source) {
      const name = basename(source)
      return name !== 'node_modules' && name !== 'dist' && name !== '.cache'
    },
    recursive: true,
  })

  for (const packageInfo of packages) {
    const stagedPackageDir = join(stagingDir, packageInfo.relativeDirectory)
    const stagedManifestPath = join(stagedPackageDir, 'package.json')
    if (versionOverride) {
      const stagedManifest = await readJson(stagedManifestPath)
      stagedManifest.version = versionOverride
      await writeJson(stagedManifestPath, stagedManifest)
    }

    for (const readme of readmeFiles)
      await cp(join(rootDir, readme), join(stagedPackageDir, readme))
  }

  return stagingDir
}

function collectExportTargets(value, targets = []) {
  if (typeof value === 'string') {
    if (value.startsWith('./'))
      targets.push(value)
    return targets
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value))
      collectExportTargets(nestedValue, targets)
  }

  return targets
}

/**
 * `versions` maps every public package name to the version this release gives it;
 * a `workspace:` dependency must resolve against the version of the package it points at.
 */
export async function validatePackedPackage(packageInfo, packed, stagingDir, versions, catalogs) {
  if (packed.name !== packageInfo.manifest.name)
    throw new Error(`Packed the wrong package: expected ${packageInfo.manifest.name}, got ${packed.name}.`)
  const version = versions.get(packed.name)
  if (packed.version !== version)
    throw new Error(`${packed.name} packed as ${packed.version}, expected ${version}.`)

  const filePaths = packed.files.map(file => file.path)
  for (const readme of readmeFiles) {
    if (!filePaths.includes(readme))
      throw new Error(`${packed.name} tarball is missing ${readme}.`)
  }

  const unwantedFile = filePaths.find(path => testFilePattern.test(path) || sensitiveFilePattern.test(path))
  if (unwantedFile)
    throw new Error(`${packed.name} tarball contains an unwanted file: ${unwantedFile}`)

  const extractDir = join(stagingDir, 'unpacked', packed.name.replaceAll('/', '__'))
  await mkdir(extractDir, { recursive: true })
  await run('tar', ['-xzf', packed.filename, '-C', extractDir], { capture: true })
  const packageRoot = join(extractDir, 'package')
  const packedManifest = await readJson(join(packageRoot, 'package.json'))

  for (const field of manifestDependencyFields) {
    for (const [name, specifier] of Object.entries(packedManifest[field] ?? {})) {
      if (typeof specifier === 'string' && /^(?:catalog|workspace):/.test(specifier))
        throw new Error(`${packed.name} still contains ${field}.${name}=${specifier}.`)
    }
  }

  for (const field of publishedDependencyFields) {
    const originalDependencies = packageInfo.manifest[field] ?? {}
    const packedDependencies = packedManifest[field] ?? {}

    for (const [name, specifier] of Object.entries(originalDependencies)) {
      if (typeof specifier !== 'string')
        continue

      let expected
      if (specifier.startsWith('workspace:')) {
        const dependencyVersion = versions.get(name)
        if (!dependencyVersion)
          throw new Error(`${packed.name} depends on ${name} through ${specifier}, but ${name} is not a public package.`)
        expected = expectedWorkspaceRange(specifier, dependencyVersion)
      }
      else if (specifier.startsWith('catalog:')) {
        expected = expectedCatalogRange(catalogs, name, specifier)
      }
      else {
        continue
      }

      if (packedDependencies[name] !== expected) {
        throw new Error(
          `${packed.name} expected ${field}.${name}=${expected}, got ${packedDependencies[name]}.`,
        )
      }
    }
  }

  const targets = [
    ...collectExportTargets(packedManifest.exports),
    ...Object.values(packedManifest.bin ?? {}).filter(value => typeof value === 'string'),
  ]
  for (const target of targets) {
    const targetPath = join(packageRoot, target)
    if (!await pathExists(targetPath))
      throw new Error(`${packed.name} export target does not exist: ${target}`)
  }

  const tarball = await readFile(packed.filename)
  const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`
  const tarballStat = await stat(packed.filename)

  return {
    files: filePaths,
    integrity,
    manifest: packedManifest,
    name: packed.name,
    path: packed.filename,
    size: tarballStat.size,
    version: packed.version,
  }
}

/** Packs every public package in the staging copy and returns validated artifacts. */
export async function packAndValidate(packages, stagingDir, versionOverride) {
  const versions = new Map(packages.map(packageInfo => [
    packageInfo.manifest.name,
    versionOverride ?? packageInfo.manifest.version,
  ]))
  logStep('Packing exact npm tarballs')
  const artifactsDir = join(stagingDir, 'artifacts')
  const catalogs = await readCatalogs()
  await mkdir(artifactsDir, { recursive: true })
  await run('pnpm', [
    'install',
    '--frozen-lockfile',
    '--ignore-scripts',
    '--offline',
  ], { capture: true, cwd: stagingDir })

  const result = await run('pnpm', [
    '--filter',
    './packages/*',
    '--recursive',
    '--workspace-concurrency=1',
    'pack',
    '--pack-destination',
    artifactsDir,
    '--json',
  ], { capture: true, cwd: stagingDir })

  let packOutput
  try {
    packOutput = JSON.parse(result.stdout)
  }
  catch {
    throw new Error(`Could not parse pnpm pack output:\n${result.stdout}`)
  }

  const packedItems = Array.isArray(packOutput) ? packOutput : [packOutput]
  if (packedItems.length !== packages.length) {
    throw new Error(`Expected ${packages.length} tarballs, got ${packedItems.length}.`)
  }

  const packageByName = new Map(packages.map(packageInfo => [packageInfo.manifest.name, packageInfo]))
  const validated = []
  for (const packed of packedItems) {
    const packageInfo = packageByName.get(packed.name)
    if (!packageInfo)
      throw new Error(`pnpm packed an unexpected package: ${packed.name}`)
    validated.push(await validatePackedPackage(
      packageInfo,
      packed,
      stagingDir,
      versions,
      catalogs,
    ))
  }

  logSuccess(`${validated.length} tarballs validated; READMEs included and workspace ranges resolved`)
  return validated
}

export async function removeStagingDir(stagingDir) {
  if (stagingDir)
    await rm(stagingDir, { force: true, recursive: true })
}

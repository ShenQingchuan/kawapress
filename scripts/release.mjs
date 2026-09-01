#!/usr/bin/env node
// @env node

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const defaultRegistry = 'https://registry.npmjs.org/'
const publishedDependencyFields = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
]
const manifestDependencyFields = [
  ...publishedDependencyFields,
  'devDependencies',
]
const readmeFiles = ['README.md', 'README.zh-CN.md']
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Z-]+(?:\.[0-9A-Z-]+)*))?$/i
const testFilePattern = /(?:^|\/)(?:__tests__|tests?)(?:\/|$)|\.(?:spec|test)\.[cm]?[jt]sx?$|\.snap$/i
const sensitiveFilePattern = /(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|id_rsa|id_ed25519)$|\.(?:key|pem|p12)$/i

class CommandError extends Error {
  constructor(command, args, result) {
    const renderedCommand = [command, ...args].join(' ')
    const details = result.stderr.trim() || result.stdout.trim()
    super(`Command failed: ${renderedCommand}${details ? `\n${details}` : ''}`)
    this.name = 'CommandError'
    this.command = renderedCommand
    this.exitCode = result.exitCode
    this.stderr = result.stderr
    this.stdout = result.stdout
  }
}

function printUsage() {
  console.log(`KawaPress release helper

Usage:
  pnpm release --version <semver> [--dry-run]
  pnpm release --version <semver> --publish [--yes]

Options:
  --version, -v <semver>  Version shared by every public package
  --tag <tag>             npm dist-tag (default: prerelease name or latest)
  --registry <url>        Registry (default: ${defaultRegistry})
  --dry-run               Pack and validate without publishing (default)
  --publish               Publish the validated tarballs
  --yes                    Skip the typed confirmation in publish mode
  --help, -h              Show this help

Examples:
  pnpm release --version 0.0.1-beta.1
  pnpm release --version 0.0.1-beta.1 --publish
`)
}

function parseArguments(argv) {
  const options = {
    dryRun: true,
    help: false,
    publish: false,
    registry: defaultRegistry,
    tag: undefined,
    version: undefined,
    yes: false,
  }
  let selectedMode

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }

    if (argument === '--dry-run') {
      if (selectedMode === 'publish')
        throw new Error('Choose either --dry-run or --publish, not both.')
      selectedMode = 'dry-run'
      options.dryRun = true
      options.publish = false
      continue
    }

    if (argument === '--publish') {
      if (selectedMode === 'dry-run')
        throw new Error('Choose either --dry-run or --publish, not both.')
      selectedMode = 'publish'
      options.dryRun = false
      options.publish = true
      continue
    }

    if (argument === '--yes') {
      options.yes = true
      continue
    }

    const valueOptions = new Map([
      ['--version', 'version'],
      ['-v', 'version'],
      ['--tag', 'tag'],
      ['--registry', 'registry'],
    ])
    const key = valueOptions.get(argument)
    if (key) {
      const value = argv[index + 1]
      if (!value || value.startsWith('-'))
        throw new Error(`${argument} needs a value.`)
      options[key] = value
      index += 1
      continue
    }

    if (!argument.startsWith('-') && !options.version) {
      options.version = argument
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  options.registry = normalizeRegistry(options.registry)
  return options
}

function normalizeRegistry(registry) {
  let url
  try {
    url = new URL(registry)
  }
  catch {
    throw new Error(`Invalid registry URL: ${registry}`)
  }

  if (url.protocol !== 'https:')
    throw new Error('The release registry must use HTTPS.')

  return url.href.endsWith('/') ? url.href : `${url.href}/`
}

function parseSemver(version) {
  const match = semverPattern.exec(version)
  if (!match)
    throw new Error(`Invalid semantic version: ${version}`)

  const prerelease = match[4]?.split('.') ?? []
  for (const identifier of prerelease) {
    if (/^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0'))
      throw new Error(`Invalid numeric prerelease identifier in ${version}: ${identifier}`)
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease,
    raw: version,
  }
}

function compareSemver(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key])
      return left[key] < right[key] ? -1 : 1
  }

  if (left.prerelease.length === 0 && right.prerelease.length === 0)
    return 0
  if (left.prerelease.length === 0)
    return 1
  if (right.prerelease.length === 0)
    return -1

  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left.prerelease[index]
    const rightIdentifier = right.prerelease[index]

    if (leftIdentifier === undefined)
      return -1
    if (rightIdentifier === undefined)
      return 1
    if (leftIdentifier === rightIdentifier)
      continue

    const leftIsNumber = /^\d+$/.test(leftIdentifier)
    const rightIsNumber = /^\d+$/.test(rightIdentifier)
    if (leftIsNumber && rightIsNumber)
      return Number(leftIdentifier) < Number(rightIdentifier) ? -1 : 1
    if (leftIsNumber)
      return -1
    if (rightIsNumber)
      return 1
    return leftIdentifier < rightIdentifier ? -1 : 1
  }

  return 0
}

function defaultTag(version) {
  const { prerelease } = parseSemver(version)
  if (prerelease.length === 0)
    return 'latest'

  const candidate = prerelease.find(identifier => /[A-Z]/i.test(identifier))
  return candidate && /^(?:alpha|beta|canary|dev|next|rc)$/i.test(candidate)
    ? candidate.toLowerCase()
    : 'next'
}

function validateTag(tag) {
  if (!/^[A-Z0-9][\w.-]*$/i.test(tag) || semverPattern.test(tag))
    throw new Error(`Invalid npm dist-tag: ${tag}`)
}

function logStep(message) {
  console.log(`\n▶ ${message}`)
}

function logSuccess(message) {
  console.log(`✓ ${message}`)
}

function logWarning(message) {
  console.warn(`! ${message}`)
}

function run(command, args, options = {}) {
  const {
    allowFailure = false,
    capture = false,
    cwd = rootDir,
    env = process.env,
  } = options

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let stderr = ''
    let stdout = ''

    if (capture) {
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (chunk) => {
        stdout += chunk
      })
      child.stderr.on('data', (chunk) => {
        stderr += chunk
      })
    }

    child.on('error', rejectPromise)
    child.on('close', (exitCode) => {
      const result = { exitCode, stderr, stdout }
      if (exitCode === 0 || allowFailure)
        resolvePromise(result)
      else
        rejectPromise(new CommandError(command, args, result))
    })
  })
}

async function pathExists(path) {
  try {
    await access(path)
    return true
  }
  catch {
    return false
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

async function discoverPackages() {
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
    if (manifest.name !== 'kawapress' && !manifest.name.startsWith('@kawapress/'))
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

async function checkToolchain() {
  const rootManifest = await readJson(join(rootDir, 'package.json'))
  const expectedPnpm = rootManifest.packageManager?.match(/^pnpm@(.+)$/)?.[1]
  if (!expectedPnpm)
    throw new Error('The root package.json must pin pnpm in packageManager.')

  const currentNode = parseSemver(`${process.versions.node.split('.').slice(0, 3).join('.')}`)
  if (compareSemver(currentNode, parseSemver('22.12.0')) < 0)
    throw new Error(`Node.js 22.12 or newer is required. Current: ${process.version}`)

  const { stdout } = await run('pnpm', ['--version'], { capture: true })
  const currentPnpm = stdout.trim()
  if (currentPnpm !== expectedPnpm)
    throw new Error(`pnpm ${expectedPnpm} is required. Current: ${currentPnpm}`)

  logSuccess(`Toolchain: Node ${process.versions.node}, pnpm ${currentPnpm}`)
}

async function checkGit(publish) {
  const { stdout: statusOutput } = await run('git', ['status', '--porcelain'], { capture: true })
  const isDirty = statusOutput.trim().length > 0

  if (publish && isDirty)
    throw new Error('The working tree must be clean before a real publish.')
  if (!publish && isDirty)
    logWarning('The working tree is not clean. This is allowed for dry-run only.')

  const { stdout: branchOutput } = await run('git', ['branch', '--show-current'], { capture: true })
  const branch = branchOutput.trim()
  if (publish && branch !== 'main')
    throw new Error(`Real releases must run from main. Current branch: ${branch || '(detached)'}`)

  if (!publish) {
    logSuccess(`Git preflight: ${branch || 'detached HEAD'}`)
    return
  }

  await run('git', ['fetch', '--quiet', 'origin', 'main'])
  const [{ stdout: headOutput }, { stdout: upstreamOutput }] = await Promise.all([
    run('git', ['rev-parse', 'HEAD'], { capture: true }),
    run('git', ['rev-parse', 'origin/main'], { capture: true }),
  ])
  if (headOutput.trim() !== upstreamOutput.trim())
    throw new Error('Local main must exactly match origin/main before publishing.')

  logSuccess('Git preflight: clean main, synchronized with origin/main')
}

async function requireCleanWorkingTree() {
  const { stdout } = await run('git', ['status', '--porcelain'], { capture: true })
  if (stdout.trim())
    throw new Error('Release checks changed the working tree. Review those changes before publishing.')
}

async function checkAuthentication(registry) {
  const result = await run('npm', ['whoami', `--registry=${registry}`], {
    allowFailure: true,
    capture: true,
  })
  if (result.exitCode !== 0) {
    throw new Error(
      `npm authentication is missing for ${registry}\nRun: npm login --registry=${registry}`,
    )
  }

  const username = result.stdout.trim()
  if (!username)
    throw new Error('npm whoami returned an empty username.')

  const ownerResult = await run('npm', [
    'owner',
    'ls',
    'kawapress',
    `--registry=${registry}`,
  ], { allowFailure: true, capture: true })
  if (ownerResult.exitCode !== 0 || !ownerResult.stdout.split(/\s+/).includes(username)) {
    throw new Error(`npm user ${username} is not listed as an owner of kawapress.`)
  }

  const orgResult = await run('npm', [
    'org',
    'ls',
    'kawapress',
    '--json',
    `--registry=${registry}`,
  ], { allowFailure: true, capture: true })
  if (orgResult.exitCode !== 0)
    throw new Error(`Could not verify @kawapress organization membership for ${username}.`)

  const organization = JSON.parse(orgResult.stdout || '{}')
  const members = Array.isArray(organization)
    ? organization
    : Object.keys(organization)
  if (!members.includes(username))
    throw new Error(`npm user ${username} is not a member of the @kawapress organization.`)

  logSuccess(`npm authentication: ${username}`)
}

async function runQualityChecks() {
  logStep('Running quality checks')
  const checks = [
    ['pnpm', ['lint']],
    ['pnpm', ['typecheck']],
    ['pnpm', ['test']],
    ['pnpm', ['build']],
  ]

  for (const [command, args] of checks)
    await run(command, args)

  logSuccess('lint, typecheck, test, and docs build passed')
}

async function copyReleaseWorkspace(packages, version) {
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
    const stagedManifest = await readJson(stagedManifestPath)
    stagedManifest.version = version
    await writeJson(stagedManifestPath, stagedManifest)

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

function expectedWorkspaceRange(specifier, version) {
  if (specifier === 'workspace:*')
    return version
  if (specifier === 'workspace:^')
    return `^${version}`
  if (specifier === 'workspace:~')
    return `~${version}`
  return specifier.replace(/^workspace:/, '')
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim()
  const quote = trimmed[0]
  if ((quote === '\'' || quote === '"') && trimmed.endsWith(quote))
    return trimmed.slice(1, -1)
  return trimmed
}

async function readCatalogs() {
  const workspace = await readFile(join(rootDir, 'pnpm-workspace.yaml'), 'utf8')
  const catalogs = new Map()
  let currentCatalog
  let insideCatalogs = false

  for (const line of workspace.split(/\r?\n/)) {
    if (!insideCatalogs) {
      if (line.trim() === 'catalogs:')
        insideCatalogs = true
      continue
    }

    if (line.trim() === '')
      continue
    if (!line.startsWith('  '))
      break

    const catalogMatch = /^ {2}([\w.-]+):\s*$/.exec(line)
    if (catalogMatch) {
      currentCatalog = catalogMatch[1]
      catalogs.set(currentCatalog, new Map())
      continue
    }

    const entryMatch = /^ {4}('[^']+'|"[^"]+"|[^:]+): (.+)$/.exec(line)
    if (!entryMatch || !currentCatalog)
      throw new Error(`Could not parse catalog line in pnpm-workspace.yaml: ${line}`)

    catalogs.get(currentCatalog).set(
      unquoteYamlScalar(entryMatch[1]),
      unquoteYamlScalar(entryMatch[2]),
    )
  }

  if (catalogs.size === 0)
    throw new Error('No named pnpm catalogs were found.')

  return catalogs
}

function expectedCatalogRange(catalogs, dependency, specifier) {
  const catalogName = specifier.slice('catalog:'.length)
  const expected = catalogs.get(catalogName)?.get(dependency)
  if (!expected)
    throw new Error(`Cannot resolve ${dependency} from named catalog ${catalogName || '(default)'}.`)
  return expected
}

async function validatePackedPackage(packageInfo, packed, stagingDir, version, catalogs) {
  if (packed.name !== packageInfo.manifest.name)
    throw new Error(`Packed the wrong package: expected ${packageInfo.manifest.name}, got ${packed.name}.`)
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
      if (specifier.startsWith('workspace:'))
        expected = expectedWorkspaceRange(specifier, version)
      else if (specifier.startsWith('catalog:'))
        expected = expectedCatalogRange(catalogs, name, specifier)
      else
        continue

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

async function packAndValidate(packages, stagingDir, version) {
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
      version,
      catalogs,
    ))
  }

  logSuccess(`${validated.length} tarballs validated; READMEs included and workspace ranges resolved`)
  return validated
}

function sortForPublish(packages) {
  const names = new Set(packages.map(packageInfo => packageInfo.name))
  const dependencies = new Map(packages.map((packageInfo) => {
    const internalDependencies = new Set()
    for (const field of ['dependencies', 'optionalDependencies']) {
      for (const dependency of Object.keys(packageInfo.manifest[field] ?? {})) {
        if (names.has(dependency))
          internalDependencies.add(dependency)
      }
    }
    return [packageInfo.name, internalDependencies]
  }))
  const packageByName = new Map(packages.map(packageInfo => [packageInfo.name, packageInfo]))
  const sorted = []

  while (dependencies.size > 0) {
    const ready = [...dependencies.entries()]
      .filter(([, packageDependencies]) => packageDependencies.size === 0)
      .map(([name]) => name)
      .sort()

    if (ready.length === 0) {
      const cycle = [...dependencies.keys()].sort().join(', ')
      throw new Error(`Production dependency cycle between packages: ${cycle}`)
    }

    for (const name of ready) {
      sorted.push(packageByName.get(name))
      dependencies.delete(name)
      for (const packageDependencies of dependencies.values())
        packageDependencies.delete(name)
    }
  }

  return sorted
}

async function getPublishedIntegrity(name, version, registry) {
  const result = await run('npm', [
    'view',
    `${name}@${version}`,
    'dist.integrity',
    '--json',
    `--registry=${registry}`,
  ], { allowFailure: true, capture: true })

  if (result.exitCode === 0) {
    const value = JSON.parse(result.stdout || 'null')
    return typeof value === 'string' ? value : null
  }

  if (/E404|404 Not Found/i.test(result.stderr))
    return null

  throw new CommandError('npm', [
    'view',
    `${name}@${version}`,
    'dist.integrity',
    '--json',
    `--registry=${registry}`,
  ], result)
}

async function waitForPublishedIntegrity(packageInfo, registry) {
  const attempts = 15
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const integrity = await getPublishedIntegrity(
      packageInfo.name,
      packageInfo.version,
      registry,
    )
    if (integrity === packageInfo.integrity)
      return
    if (integrity && integrity !== packageInfo.integrity)
      throw new Error(`Registry integrity verification failed for ${packageInfo.name}.`)
    if (attempt < attempts - 1)
      await delay(2_000)
  }

  throw new Error(`Timed out while verifying ${packageInfo.name}@${packageInfo.version} on npm.`)
}

async function getPublishedTag(name, tag, registry) {
  const result = await run('npm', [
    'view',
    name,
    `dist-tags.${tag}`,
    '--json',
    `--registry=${registry}`,
  ], { allowFailure: true, capture: true })

  if (result.exitCode !== 0) {
    if (/E404|404 Not Found/i.test(result.stderr))
      return null
    throw new CommandError('npm', [
      'view',
      name,
      `dist-tags.${tag}`,
      '--json',
      `--registry=${registry}`,
    ], result)
  }

  const value = JSON.parse(result.stdout || 'null')
  return typeof value === 'string' ? value : null
}

async function waitForDistTag(packageInfo, tag, registry) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await getPublishedTag(packageInfo.name, tag, registry)
    if (current === packageInfo.version)
      return
    await delay(500 * (attempt + 1))
  }

  const current = await getPublishedTag(packageInfo.name, tag, registry)
  throw new Error(
    `dist-tag verification failed for ${packageInfo.name}: expected ${tag}=${packageInfo.version}, got ${current}.`,
  )
}

async function promptForOtp() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'npm requires a fresh one-time password. Rerun in an interactive terminal or use an authorized publishing token.',
    )
  }

  const mutedOutput = new Writable({
    write(_chunk, _encoding, callback) {
      callback()
    },
  })
  const readline = createInterface({
    input: process.stdin,
    output: mutedOutput,
    terminal: true,
  })
  process.stdout.write('npm one-time password: ')
  try {
    const otp = (await readline.question('')).trim()
    if (!/^\d{6}$/.test(otp))
      throw new Error('The npm one-time password must contain 6 digits.')
    return otp
  }
  finally {
    readline.close()
    process.stdout.write('\n')
  }
}

async function runRegistryWrite(command, args) {
  let result = await run(command, args, { allowFailure: true, capture: true })
  if (result.exitCode === 0)
    return result

  const output = `${result.stderr}\n${result.stdout}`
  if (!/EOTP|one-time password|two-factor authentication/i.test(output))
    throw new CommandError(command, args, result)

  const otp = await promptForOtp()
  result = await run(command, args, {
    allowFailure: true,
    capture: true,
    env: {
      ...process.env,
      npm_config_otp: otp,
    },
  })
  if (result.exitCode === 0)
    return result

  const details = (result.stderr.trim() || result.stdout.trim()).replaceAll(otp, '[redacted]')
  throw new Error(`Registry command failed after OTP verification${details ? `:\n${details}` : '.'}`)
}

async function ensureDistTag(packageInfo, tag, registry) {
  const current = await getPublishedTag(packageInfo.name, tag, registry)
  if (current === packageInfo.version)
    return

  if (current && compareSemver(parseSemver(current), parseSemver(packageInfo.version)) > 0) {
    throw new Error(
      `Refusing to move dist-tag ${tag} backwards from ${current} to ${packageInfo.version} for ${packageInfo.name}.`,
    )
  }

  await runRegistryWrite('npm', [
    'dist-tag',
    'add',
    `${packageInfo.name}@${packageInfo.version}`,
    tag,
    `--registry=${registry}`,
  ])

  await waitForDistTag(packageInfo, tag, registry)
}

async function inspectRegistry(packages, registry, tag) {
  logStep('Checking npm version availability')
  const states = new Map()

  for (const packageInfo of packages) {
    const publishedIntegrity = await getPublishedIntegrity(
      packageInfo.name,
      packageInfo.version,
      registry,
    )

    if (!publishedIntegrity) {
      states.set(packageInfo.name, 'available')
      continue
    }

    if (publishedIntegrity !== packageInfo.integrity) {
      throw new Error(
        `${packageInfo.name}@${packageInfo.version} already exists with different contents.`,
      )
    }

    states.set(packageInfo.name, 'identical')
  }

  for (const packageInfo of packages) {
    const current = await getPublishedTag(packageInfo.name, tag, registry)
    if (current && compareSemver(parseSemver(current), parseSemver(packageInfo.version)) > 0) {
      throw new Error(
        `Refusing to move dist-tag ${tag} backwards from ${current} to ${packageInfo.version} for ${packageInfo.name}.`,
      )
    }
  }

  const available = [...states.values()].filter(state => state === 'available').length
  const identical = states.size - available
  logSuccess(`${available} versions available${identical ? `; ${identical} identical versions can be resumed` : ''}`)
  return states
}

async function dryRunPublish(packages, options) {
  logStep(`Simulating npm publish with dist-tag ${options.tag}`)

  for (const packageInfo of packages) {
    await run('npm', [
      'publish',
      packageInfo.path,
      '--dry-run',
      '--access',
      'public',
      '--tag',
      options.tag,
      '--registry',
      options.registry,
      '--json',
    ], { capture: true })
    logSuccess(`${packageInfo.name}@${packageInfo.version}`)
  }
}

async function confirmPublish(options, packages, states) {
  if (options.yes)
    return
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error('Publish mode needs an interactive terminal or the explicit --yes flag.')

  const pending = packages.filter(packageInfo => states.get(packageInfo.name) === 'available')
  console.log(`\nThis will publish ${pending.length} package(s) as ${options.version} with dist-tag ${options.tag}.`)
  const readline = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await readline.question(`Type ${options.version} to continue: `)
  readline.close()

  if (answer.trim() !== options.version)
    throw new Error('Release cancelled.')
}

async function publishPackages(packages, states, options) {
  logStep(`Publishing to npm with dist-tag ${options.tag}`)

  for (const packageInfo of packages) {
    if (states.get(packageInfo.name) === 'available') {
      await runRegistryWrite('npm', [
        'publish',
        packageInfo.path,
        '--access',
        'public',
        '--tag',
        options.tag,
        '--registry',
        options.registry,
      ])

      await waitForPublishedIntegrity(packageInfo, options.registry)
    }

    await ensureDistTag(packageInfo, options.tag, options.registry)
    const resumed = states.get(packageInfo.name) === 'identical' ? ' (resumed)' : ''
    logSuccess(`${packageInfo.name}@${packageInfo.version}${resumed}`)
  }
}

async function updateWorkspaceVersions(packages, version) {
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

function printPackagePlan(packages, options) {
  console.log('\nRelease plan')
  console.log(`  mode:     ${options.dryRun ? 'dry-run' : 'publish'}`)
  console.log(`  version:  ${options.version}`)
  console.log(`  dist-tag: ${options.tag}`)
  console.log(`  registry: ${options.registry}`)
  console.log(`  packages: ${packages.length}`)
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    printUsage()
    return
  }
  if (!options.version)
    throw new Error('A release version is required. Use --version <semver>.')

  const targetVersion = parseSemver(options.version)
  options.tag ??= defaultTag(options.version)
  validateTag(options.tag)

  const packages = await discoverPackages()
  const currentVersions = new Set(packages.map(packageInfo => packageInfo.manifest.version))
  if (currentVersions.size !== 1)
    throw new Error(`Public package versions must match. Found: ${[...currentVersions].join(', ')}`)

  const currentVersion = parseSemver([...currentVersions][0])
  if (compareSemver(targetVersion, currentVersion) < 0)
    throw new Error(`Target version ${options.version} is lower than current version ${currentVersion.raw}.`)

  printPackagePlan(packages, options)

  logStep('Checking release prerequisites')
  await checkToolchain()
  await checkGit(options.publish)
  if (options.publish)
    await checkAuthentication(options.registry)

  await runQualityChecks()
  if (options.publish)
    await requireCleanWorkingTree()

  let stagingDir
  try {
    stagingDir = await copyReleaseWorkspace(packages, options.version)
    const packedPackages = await packAndValidate(packages, stagingDir, options.version)
    const publishOrder = sortForPublish(packedPackages)
    const registryStates = await inspectRegistry(
      publishOrder,
      options.registry,
      options.tag,
    )

    if (options.dryRun) {
      await dryRunPublish(publishOrder, options)
      console.log(`\nDry-run complete. Nothing was published and package versions were not changed.`)
      console.log(`To publish: pnpm release --version ${options.version} --tag ${options.tag} --publish`)
      return
    }

    await requireCleanWorkingTree()
    await confirmPublish(options, publishOrder, registryStates)
    await publishPackages(publishOrder, registryStates, options)
    await updateWorkspaceVersions(packages, options.version)

    console.log(`\nPublished ${packages.length} packages as ${options.version} with dist-tag ${options.tag}.`)
    console.log('Package versions were updated locally. Commit those package.json changes, then create the Git tag.')
  }
  finally {
    if (stagingDir)
      await rm(stagingDir, { force: true, recursive: true })
  }
}

main().catch((error) => {
  console.error(`\nRelease failed: ${error.message}`)
  process.exitCode = 1
})

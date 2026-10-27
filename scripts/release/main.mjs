/** Entry point: works out the release mode, runs the preflight checks, and publishes. */

import process from 'node:process'

import { checkAuthentication } from './auth.mjs'
import {
  checkCiReleaseEnvironment,
  findCommittedVersionProblems,
  formatMissingPackagesError,
  isOidcPublishingAvailable,
} from './ci.mjs'
import { parseArguments, printUsage } from './cli.mjs'
import { minNpmVersionForTrustedPublishing } from './constants.mjs'
import { assertGitClean, checkGit, requireCleanWorkingTree } from './git.mjs'
import { copyReleaseWorkspace, packAndValidate, removeStagingDir } from './pack.mjs'
import { assertVersionIsNotOlder, discoverPackages, readLockstepVersion, updateWorkspaceVersions } from './packages.mjs'
import { confirmPublish, dryRunPublish, filterPublishOrder, publishPackages, sortForPublish } from './publish.mjs'
import { runQualityChecks } from './quality.mjs'
import { findMissingPackages, inspectRegistry, logMissingPackages } from './registry.mjs'
import { logStep, logSuccess } from './runtime.mjs'
import { compareSemver, defaultTag, parseSemver, tagNameForVersion, validateTag } from './semver.mjs'
import { checkNpmVersion, checkToolchain } from './toolchain.mjs'
import { printTrustCommands } from './trust.mjs'

/** Modes that write to npm and therefore need a logged-in maintainer when run locally. */
const publishingModes = new Set(['publish', 'bootstrap'])

export async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv)
  if (options.help) {
    printUsage()
    return
  }
  if (!options.version)
    throw new Error('A release version is required. Use --version <semver>.')

  parseSemver(options.version)
  options.tag ??= defaultTag(options.version)
  validateTag(options.tag)

  const packages = await discoverPackages()
  const packageNames = packages.map(packageInfo => packageInfo.manifest.name)
  const committedVersion = readLockstepVersion(packages)

  if (options.mode === 'prepare')
    return prepareRelease(options, packages, committedVersion)

  const ci = isOidcPublishingAvailable(process.env)
  rejectVersionMismatch({ ci, committedVersion, options })
  assertVersionIsNotOlder(options.version, committedVersion)

  printPackagePlan(packages, options)

  logStep('Checking release prerequisites')
  await checkToolchain()

  if (ci) {
    await checkNpmVersion(minNpmVersionForTrustedPublishing)
    await checkCiReleaseEnvironment({ version: options.version })
  }
  else {
    await checkGit(publishingModes.has(options.mode))
    if (publishingModes.has(options.mode))
      await checkAuthentication(options.registry)
  }

  // A trusted publisher only exists for packages that are already on npm, and CI must
  // never publish half of the release, so missing packages stop the run before any write.
  if (ci) {
    const missing = await findMissingPackages(packageNames, { registry: options.registry })
    if (missing.length > 0)
      throw new Error(formatMissingPackagesError(missing))
    logSuccess(`${packageNames.length} packages already exist on npm`)
  }

  let bootstrapTargets
  if (options.mode === 'bootstrap') {
    const missing = await findMissingPackages(packageNames, { registry: options.registry })
    logMissingPackages(missing)
    if (missing.length === 0) {
      printTrustCommands(packageNames)
      return
    }
    bootstrapTargets = new Set(missing)
  }

  if (options.mode === 'bootstrap') {
    logStep('Skipping lint, typecheck, test and docs build')
    console.log('Bootstrap only creates the missing npm packages so that trusted publishing can be')
    console.log('configured; the release workflow runs the quality checks before the real publish.')
  }
  else {
    await runQualityChecks()
    // A dry run may legitimately leave build output behind; a real publish may not.
    if (options.mode === 'publish')
      await requireCleanWorkingTree()
  }

  let stagingDir
  try {
    stagingDir = await copyReleaseWorkspace(packages, options.version)
    const packedPackages = await packAndValidate(packages, stagingDir, options.version)
    const publishOrder = filterPublishOrder(sortForPublish(packedPackages), bootstrapTargets)
    const registryStates = await inspectRegistry(publishOrder, options.registry, options.tag)

    if (options.mode === 'dry-run') {
      await dryRunPublish(publishOrder, options)
      console.log(`\nDry-run complete. Nothing was published and package versions were not changed.`)
      console.log(`To publish: pnpm release --version ${options.version} --tag ${options.tag} --publish`)
      return
    }

    if (options.mode === 'bootstrap') {
      await confirmPublish(options, publishOrder, registryStates)
      await publishPackages(publishOrder, registryStates, options)
      console.log(`\nBootstrapped ${publishOrder.length} package(s) at ${options.version} with dist-tag ${options.tag}.`)
      printTrustCommands(packageNames)
      return
    }

    await requireCleanWorkingTree()
    await confirmPublish(options, publishOrder, registryStates)
    await publishPackages(publishOrder, registryStates, options)

    if (ci) {
      console.log(`\nPublished ${publishOrder.length} packages as ${options.version} with dist-tag ${options.tag} from GitHub Actions.`)
      console.log(`Check the provenance badge on https://www.npmjs.com/package/kawapress/v/${options.version}`)
      return
    }

    await updateWorkspaceVersions(packages, options.version)
    console.log(`\nPublished ${packages.length} packages as ${options.version} with dist-tag ${options.tag}.`)
    console.log('Package versions were updated locally. Commit those package.json changes, then create the Git tag.')
  }
  finally {
    await removeStagingDir(stagingDir)
  }
}

/** Rewrites the lockstep version of every public package so the bump can be committed. */
async function prepareRelease(options, packages, committedVersion) {
  if (compareSemver(parseSemver(options.version), parseSemver(committedVersion)) <= 0) {
    throw new Error(
      `Package versions are already ${committedVersion}. Choose a version higher than ${committedVersion}.`,
    )
  }

  printPackagePlan(packages, options)

  logStep('Checking release prerequisites')
  await checkToolchain()
  await assertGitClean('The working tree must be clean before the version bump.')

  await updateWorkspaceVersions(packages, options.version)
  logSuccess(`${packages.length} package.json files now declare version ${options.version}`)

  const tag = tagNameForVersion(options.version)
  console.log('\nNext steps:')
  console.log(`  1. review the diff: git diff --stat`)
  console.log(`  2. git commit -am "chore: 发布 ${options.version}" && git push origin main`)
  console.log('  3. wait for the CI workflow on main to pass')
  console.log(`  4. git tag ${tag} && git push origin ${tag}`)
  console.log('  5. the Release workflow publishes on its own; check npm when it finishes')
}

function rejectVersionMismatch({ ci, committedVersion, options }) {
  const needsMatch = ci || options.mode === 'bootstrap'
  if (!needsMatch)
    return

  const problems = findCommittedVersionProblems({
    committedVersion,
    mode: options.mode,
    releaseVersion: options.version,
  })
  if (problems.length > 0)
    throw new Error(problems.join('\n'))
}

function printPackagePlan(packages, options) {
  console.log('\nRelease plan')
  console.log(`  mode:     ${options.mode}`)
  console.log(`  version:  ${options.version}`)
  console.log(`  dist-tag: ${options.mode === 'prepare' ? '(not published)' : options.tag}`)
  console.log(`  registry: ${options.registry}`)
  console.log(`  packages: ${packages.length}`)
}

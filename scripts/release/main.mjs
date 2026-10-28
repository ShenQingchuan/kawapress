/** Entry point: works out the release mode, runs the preflight checks, and publishes. */

import process from 'node:process'

import { checkAuthentication } from './auth.mjs'
import { checkCiReleaseEnvironment, formatMissingPackagesError, isOidcPublishingAvailable } from './ci.mjs'
import { parseArguments, printUsage } from './cli.mjs'
import { minNpmVersionForTrustedPublishing } from './constants.mjs'
import { assertGitClean, checkGit, requireCleanWorkingTree } from './git.mjs'
import { publishToGitHubPackages } from './github-packages.mjs'
import { copyReleaseWorkspace, packAndValidate, removeStagingDir } from './pack.mjs'
import { applyBumps, discoverPackages, parseBumps } from './packages.mjs'
import { confirmPublish, dryRunPublish, filterPublishOrder, publishPackages, sortForPublish } from './publish.mjs'
import { runQualityChecks } from './quality.mjs'
import { findMissingPackages, inspectRegistry, isSkippedState, logMissingPackages } from './registry.mjs'
import { logStep, logSuccess } from './runtime.mjs'
import { defaultTag, parseSemver, validateTag } from './semver.mjs'
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

  if (options.tag)
    validateTag(options.tag)

  const packages = await discoverPackages()
  const packageNames = packages.map(packageInfo => packageInfo.manifest.name)

  if (options.mode === 'prepare')
    return prepareRelease(options, packages)

  // A bootstrap only reserves names on npm, so it pins every package to a placeholder
  // version. A real release publishes each package at the version it already declares.
  const versionOverride = options.mode === 'bootstrap' ? options.version : undefined
  if (options.mode === 'bootstrap') {
    if (!versionOverride)
      throw new Error('Bootstrap needs a placeholder version. Use --version <semver>, for example 0.0.1.')
    parseSemver(versionOverride)
  }
  else if (options.version) {
    throw new Error('--version only applies to --bootstrap. Set each package version with release:prepare.')
  }

  const ci = isOidcPublishingAvailable(process.env)
  printPackagePlan(packages, options)

  logStep('Checking release prerequisites')
  await checkToolchain()

  if (ci) {
    await checkNpmVersion(minNpmVersionForTrustedPublishing)
    await checkCiReleaseEnvironment()
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
    stagingDir = await copyReleaseWorkspace(packages, versionOverride)
    const packedPackages = (await packAndValidate(packages, stagingDir, versionOverride))
      .map(packed => ({ ...packed, tag: options.tag ?? defaultTag(packed.version) }))
    const publishOrder = filterPublishOrder(sortForPublish(packedPackages), bootstrapTargets)
    const registryStates = await inspectRegistry(publishOrder, options.registry)

    if (options.mode === 'dry-run') {
      // Only versions npm does not have yet can be simulated; npm refuses to republish the rest.
      await dryRunPublish(
        publishOrder.filter(packageInfo => registryStates.get(packageInfo.name) === 'available'),
        options,
      )
      console.log('\nDry-run complete. Nothing was published and package versions were not changed.')
      return
    }

    if (options.mode === 'bootstrap') {
      await confirmPublish(options, publishOrder, registryStates)
      await publishPackages(publishOrder, registryStates, options)
      console.log(`\nBootstrapped ${publishOrder.length} package(s) at ${versionOverride}.`)
      printTrustCommands(packageNames)
      return
    }

    await requireCleanWorkingTree()
    await confirmPublish(options, publishOrder, registryStates)
    await publishPackages(publishOrder, registryStates, options)
    // The GitHub token only exists in the release workflow; local publishes skip the mirror.
    if (ci && process.env.GITHUB_TOKEN)
      await publishToGitHubPackages(publishOrder, process.env.GITHUB_TOKEN)
    printPublishSummary(publishOrder, registryStates, ci)
  }
  finally {
    await removeStagingDir(stagingDir)
  }
}

/** Lists what this run published, and what it left alone. */
function printPublishSummary(publishOrder, states, ci) {
  const published = publishOrder.filter(packageInfo => !isSkippedState(states.get(packageInfo.name)))
  console.log(`\nPublished ${published.length} package(s)${ci ? ' from GitHub Actions' : ''}:`)
  for (const packageInfo of published)
    console.log(`  ${packageInfo.name}@${packageInfo.version} (dist-tag ${packageInfo.tag})`)
  if (ci && published.length > 0)
    console.log(`Check the provenance badge on https://www.npmjs.com/package/${published[0].name}/v/${published[0].version}`)
}

/** Rewrites the version of the named packages so the bump can be committed. */
async function prepareRelease(options, packages) {
  if (options.bumps.length === 0)
    throw new Error('Name the packages to release, for example: pnpm release:prepare @kawapress/plugin-mermaid=0.2.1')

  const bumps = parseBumps(packages, options.bumps)
  // New sites get `kawapressVersion` from create-kawapress, so it has to ship with every
  // kawapress release or it keeps pointing at the old version.
  if (bumps.has('kawapress') && !bumps.has('create-kawapress')) {
    throw new Error('kawapress changes the version create-kawapress writes into new sites, so release both: add create-kawapress=<version>.')
  }

  logStep('Checking release prerequisites')
  await checkToolchain()
  await assertGitClean('The working tree must be clean before the version bump.')

  const changed = await applyBumps(packages, bumps)
  logSuccess(`${changed.length} package.json file(s) changed`)
  for (const [name, version] of bumps)
    console.log(`  ${name} → ${version}`)

  console.log('\nNext steps:')
  console.log('  1. review the diff: git diff')
  console.log('  2. git commit -am "chore: 发布 <简述>" && git push origin main')
  console.log('  3. wait for the CI workflow on main to pass')
  console.log('  4. git tag v<name> && git push origin v<name>   (any unused tag that starts with v)')
  console.log('  5. the Release workflow publishes on its own; check npm when it finishes')
}

function printPackagePlan(packages, options) {
  console.log('\nRelease plan')
  console.log(`  mode:     ${options.mode}`)
  console.log(`  dist-tag: ${options.tag ?? '(per package: latest, or the prerelease name)'}`)
  console.log(`  registry: ${options.registry}`)
  console.log(`  packages: ${packages.length}`)
}

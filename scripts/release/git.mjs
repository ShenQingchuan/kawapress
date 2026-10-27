/** Git preflight checks for local and tagged CI releases. */

import { logSuccess, logWarning, run } from './runtime.mjs'

/** Dirty-tree guard used right before any write to npm. */
export async function assertGitClean(message) {
  const { stdout } = await run('git', ['status', '--porcelain'], { capture: true })
  if (stdout.trim())
    throw new Error(message)
}

/**
 * Local preflight: a real publish must run from a clean `main` that matches origin.
 * A dry run only reports the state so it also works on a scratch branch.
 */
export async function checkGit(publish) {
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

export async function requireCleanWorkingTree() {
  await assertGitClean('Release checks changed the working tree. Review those changes before publishing.')
}

/** HEAD and the commit the release tag points at; `tagCommit` is null when the tag is absent. */
export async function readReleaseCommits(tagName) {
  const [{ stdout: headOutput }, tagResult] = await Promise.all([
    run('git', ['rev-parse', 'HEAD'], { capture: true }),
    run('git', ['rev-parse', `refs/tags/${tagName}^{commit}`], { allowFailure: true, capture: true }),
  ])

  return {
    headCommit: headOutput.trim(),
    tagCommit: tagResult.exitCode === 0 ? tagResult.stdout.trim() || null : null,
  }
}

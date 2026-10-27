/** CI mode: publishing through npm trusted publishing from a tagged GitHub Actions run. */

import process from 'node:process'

import { publishWorkflowFile } from './constants.mjs'
import { readReleaseCommits } from './git.mjs'
import { logSuccess } from './runtime.mjs'
import { tagNameForVersion } from './semver.mjs'

/**
 * True when npm can mint an OIDC token for this run. GitHub only exposes the token
 * endpoint to jobs that were granted `permissions: id-token: write`.
 */
export function isOidcPublishingAvailable(env = process.env) {
  return Boolean(env.ACTIONS_ID_TOKEN_REQUEST_URL?.trim())
}

/**
 * Pure check set for a tagged CI release. Returns human-readable problems;
 * an empty array means the checkout really is the tagged release commit.
 */
export function findCiEnvironmentProblems({ env, version, headCommit, tagCommit }) {
  const problems = []
  const expectedTag = tagNameForVersion(version)

  if (env.GITHUB_ACTIONS !== 'true') {
    problems.push(
      'ACTIONS_ID_TOKEN_REQUEST_URL is set but GITHUB_ACTIONS is not "true"; refusing to treat this as a GitHub Actions release.',
    )
  }

  if (env.GITHUB_REF_TYPE !== 'tag') {
    problems.push(
      `The release workflow must run for a tag, but it ran for ${env.GITHUB_REF_TYPE || '(unknown)'} ${env.GITHUB_REF_NAME || ''}. Push a ${expectedTag} tag to release.`,
    )
  }
  else if (env.GITHUB_REF_NAME !== expectedTag) {
    problems.push(`Tag ${env.GITHUB_REF_NAME} does not match release version ${version}. Expected ${expectedTag}.`)
  }

  if (env.GITHUB_SHA && headCommit !== env.GITHUB_SHA) {
    problems.push(
      `HEAD is ${headCommit} but the workflow ran for ${env.GITHUB_SHA}. Check out the tagged commit (actions/checkout ref: \${{ github.ref }}).`,
    )
  }

  if (!tagCommit) {
    problems.push(
      `Tag ${expectedTag} is not in this checkout. Fetch full history and tags (actions/checkout with fetch-depth: 0).`,
    )
  }
  else if (tagCommit !== headCommit) {
    problems.push(`Tag ${expectedTag} points at ${tagCommit}, but HEAD is ${headCommit}. Tags must be created on the release commit.`)
  }

  return problems
}

/** Fails unless this run is the tagged release commit, resolved by Git and by GitHub. */
export async function checkCiReleaseEnvironment({ version, env = process.env }) {
  const { headCommit, tagCommit } = await readReleaseCommits(tagNameForVersion(version))
  const problems = findCiEnvironmentProblems({ env, version, headCommit, tagCommit })

  if (problems.length > 0) {
    throw new Error([
      `Refusing to publish ${version} from this run:`,
      ...problems.map(problem => `- ${problem}`),
    ].join('\n'))
  }

  logSuccess(`CI preflight: ${tagNameForVersion(version)} is checked out at ${headCommit.slice(0, 7)}`)
}

/**
 * Pure check that the committed package versions are exactly the version being released.
 * CI publishes what is committed: the release is cut by committing the bump, then tagging.
 */
export function findCommittedVersionProblems({ committedVersion, mode, releaseVersion }) {
  if (committedVersion === releaseVersion)
    return []

  const fix = mode === 'bootstrap'
    ? `Bootstrap publishes the version you pass with --version, whatever is committed:\n  pnpm release --version ${releaseVersion} --bootstrap`
    : `Cut the release by committing the bump first, then tag that commit:\n  pnpm release:prepare --version ${releaseVersion}\n  git commit -am "chore: 发布 ${releaseVersion}" && git push origin main`

  return [
    `The committed package version is ${committedVersion}, but the release version is ${releaseVersion}.`,
    fix,
  ]
}

/** In CI a partial publish is unrecoverable, so every package must already exist on npm. */
export function formatMissingPackagesError(missing) {
  return [
    `These packages do not exist on npm yet: ${missing.join(', ')}`,
    '',
    'npm trusted publishing can only be configured for a package that already exists,',
    `and ${publishWorkflowFile} publishes all packages in one run, so they must be bootstrapped first.`,
    '',
    'Run this once, locally, from a clean main:',
    '  npm login',
    '  pnpm release --version <current package version> --bootstrap',
    '',
    'Then configure the trusted publisher for every package; see RELEASING.md.',
  ].join('\n')
}
